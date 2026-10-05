import type { WorkflowSuggestionBaseline, WorkflowSuggestionContent } from '@n8n/api-types';
import { createWorkflow, createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import {
	type Project,
	ProjectRepository,
	SharedWorkflow,
	SharedWorkflowRepository,
	TransactionRunner,
	type User,
	UserRepository,
	WorkflowEntity,
	WorkflowRepository,
	WorkflowHistoryRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, type EntityManager } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

import { createUser } from '@test-integration/db/users';

import { WorkflowSuggestionActivity } from '../database/workflow-suggestion-activity.entity';
import { WorkflowSuggestion } from '../database/workflow-suggestion.entity';
import { WorkflowSuggestionRepository } from '../database/workflow-suggestion.repository';
import { WorkflowSuggestionService } from '../workflow-suggestion.service';

let suggestions: WorkflowSuggestionRepository;
let tx: TransactionRunner;
let workflow: WorkflowEntity;
let project: Project;
let backgroundUser: User;
const baseline = (): WorkflowSuggestionBaseline => ({
	workflowId: workflow.id,
	projectId: project.id,
	backgroundUserId: backgroundUser.id,
	expectedBaseline: {
		savedVersionId: randomUUID(),
		publishedVersionId: randomUUID(),
		checksum: 'a'.repeat(64),
		versionCounter: workflow.versionCounter,
		savedAt: workflow.updatedAt.toISOString(),
		publicationId: null,
	},
	original: { name: 'Example', nodes: [], connections: {} },
});
const payload = (): WorkflowSuggestionContent => ({
	original: baseline().original,
	candidate: { nodes: [], connections: {} },
	explanation: 'Fix the workflow.',
	errorContext: null,
});
const saveProposal = async () =>
	await tx.run({}, async (ctx) => {
		const suggestion = await suggestions.createPending(baseline(), payload(), ctx, 'fix_ready');
		await suggestions.appendSubmittedActivity(suggestion.id, ctx);
		return suggestion;
	});

beforeAll(async () => {
	await testModules.loadModules(['instance-ai']);
	await testDb.init();
	suggestions = Container.get(WorkflowSuggestionRepository);
	tx = Container.get(TransactionRunner);
});
beforeEach(async () => {
	backgroundUser = await createUser();
	project = await createTeamProject();
	workflow = await createWorkflow({}, project);
});
afterAll(async () => await testDb.terminate());
afterEach(async () => {
	await Container.get(DataSource).getRepository(WorkflowSuggestionActivity).clear();
	await suggestions.createQueryBuilder().delete().execute();
});

it('accepts only one concurrent pending proposal for a workflow', async () => {
	const results = await Promise.allSettled([saveProposal(), saveProposal()]);
	expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
	expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
	expect(await suggestions.count()).toBe(1);
	const [suggestion] = await suggestions.find();
	expect(suggestion.state).toBe('pending');
	expect(await suggestions.getActivity(suggestion.id)).toHaveLength(1);
	await expect(saveProposal()).rejects.toThrow('pending proposal');
});

it('allows a new proposal after the previous proposal closes', async () => {
	const first = await saveProposal();
	await suggestions.update(first.id, {
		state: 'closed',
		closedReason: 'discarded',
		closedAt: new Date(),
	});
	const second = await saveProposal();
	expect(second.id).not.toBe(first.id);
	expect(await suggestions.count()).toBe(2);
});

it('rolls back the suggestion and its activity when activity insertion fails', async () => {
	await expect(
		tx.run({}, async (ctx) => {
			const suggestion = await suggestions.createPending(baseline(), payload(), ctx, 'fix_ready');
			await suggestions.appendSubmittedActivity(suggestion.id, ctx);
			await suggestions.appendSubmittedActivity(suggestion.id, ctx);
		}),
	).rejects.toThrow();
	expect(await suggestions.count()).toBe(0);
	expect(await Container.get(DataSource).getRepository(WorkflowSuggestionActivity).count()).toBe(0);
});

it('joins the caller transaction and rolls back both rows if finalization fails', async () => {
	await expect(
		tx.run({}, async (ctx) => {
			await tx.run(ctx, async (ctx) => {
				const suggestion = await suggestions.createPending(baseline(), payload(), ctx, 'fix_ready');
				await suggestions.appendSubmittedActivity(suggestion.id, ctx);
			});
			throw new Error('Investigation completion failed.');
		}),
	).rejects.toThrow('Investigation completion failed.');
	expect(await suggestions.count()).toBe(0);
	expect(await Container.get(DataSource).getRepository(WorkflowSuggestionActivity).count()).toBe(0);
});

it.each([
	{
		parent: 'workflow',
		remove: async () => await Container.get(WorkflowRepository).delete(workflow.id),
	},
	{
		parent: 'project',
		remove: async () => await Container.get(ProjectRepository).delete(project.id),
	},
	{
		parent: 'background user',
		remove: async () => await Container.get(UserRepository).delete(backgroundUser.id),
	},
])(
	'deletes the suggestion and activity with its $parent and rejects a late save',
	async ({ remove }) => {
		const originalBaseline = baseline();
		const suggestion = await saveProposal();
		expect(await suggestions.getActivity(suggestion.id)).toHaveLength(1);

		await remove();

		expect(await suggestions.findOneBy({ id: suggestion.id })).toBeNull();
		expect(await suggestions.getActivity(suggestion.id)).toHaveLength(0);
		await expect(
			tx.run(
				{},
				async (ctx) =>
					await suggestions.createPending(originalBaseline, payload(), ctx, 'fix_ready'),
			),
		).rejects.toThrow(/foreign key/i);
		expect(await suggestions.count()).toBe(0);
	},
);

it('leaves workflow and history unchanged and reads the current saved workflow', async () => {
	const workflows = Container.get(WorkflowRepository);
	const histories = Container.get(WorkflowHistoryRepository);
	const before = await workflows.findOneByOrFail({ id: workflow.id });
	const historyCount = await histories.count();
	await tx.run({}, async (ctx) => {
		const currentWorkflow = await workflows.findByIdInContext(workflow.id, ctx);
		expect(currentWorkflow?.versionId).toBe(before.versionId);
		const suggestion = await suggestions.createPending(baseline(), payload(), ctx, 'fix_ready');
		await suggestions.appendSubmittedActivity(suggestion.id, ctx);
	});
	expect(await workflows.findOneByOrFail({ id: workflow.id })).toEqual(before);
	expect(await histories.count()).toBe(historyCount);
	await workflows.update(workflow.id, { settings: { executionTimeout: 45 } });
	await tx.run({}, async (ctx) => {
		const currentWorkflow = await workflows.findByIdInContext(workflow.id, ctx);
		expect(currentWorkflow?.settings).toEqual({ executionTimeout: 45 });
	});
});

describe.skipIf(process.env.DB_TYPE !== 'postgresdb')('PostgreSQL concurrent writes', () => {
	let peer: DataSource;

	beforeAll(async () => {
		// Use another pool so a busy application connection cannot make the test pass.
		peer = await new DataSource({
			...Container.get(DataSource).options,
			synchronize: false,
			migrationsRun: false,
			dropSchema: false,
		}).initialize();
	});
	afterAll(async () => {
		if (peer?.isInitialized) await peer.destroy();
	});

	it('lets another request close a suggestion while its read transaction stays open', async () => {
		const suggestion = await saveProposal();
		await tx.run({}, async (ctx) => {
			const current = await suggestions.getSuggestion(suggestion.id, suggestion, ctx);
			await peer.transaction(async (manager) => {
				await manager.query("SET LOCAL lock_timeout = '250ms'");
				await manager.update(
					WorkflowSuggestion,
					{ id: suggestion.id, state: 'pending' },
					{
						state: 'closed',
						closedReason: 'discarded',
						closedAt: new Date(),
					},
				);
			});
			expect(await suggestions.closePending(current, 'outdated', null, ctx)).toBe(false);
			expect(await suggestions.getSuggestion(suggestion.id, suggestion, ctx)).toMatchObject({
				state: 'closed',
				closedReason: 'discarded',
			});
		});
		expect((await suggestions.getActivity(suggestion.id)).map(({ action }) => action)).toEqual([
			'submitted',
		]);
	});

	async function assertWriteBlocked(write: (manager: EntityManager) => Promise<unknown>) {
		await tx.run({}, async (ctx) => {
			await Container.get(WorkflowSuggestionService).readWorkflowTargetForApply(workflow.id, ctx);
			await expect(
				peer.transaction(async (manager) => {
					await manager.query("SET LOCAL lock_timeout = '250ms'");
					await write(manager);
				}),
			).rejects.toThrow('lock timeout');
		});
		await peer.transaction(write);
	}

	it('holds a workflow save until the Apply transaction commits', async () => {
		await assertWriteBlocked(
			async (manager) =>
				await manager.update(WorkflowEntity, workflow.id, {
					settings: { executionTimeout: 60 },
				}),
		);
	});

	it('holds a transfer to an existing sharing until the Apply transaction commits', async () => {
		const destination = await createTeamProject();
		await peer.manager.insert(SharedWorkflow, {
			workflowId: workflow.id,
			projectId: destination.id,
			role: 'workflow:editor',
		});
		const sharings = Container.get(SharedWorkflowRepository);
		await assertWriteBlocked(async (manager) => {
			await sharings.makeOwner([workflow.id], destination.id, manager);
			await sharings.deleteByIds([workflow.id], project.id, manager);
		});
	});

	it('lets an earlier transfer finish before it reads the owner', async () => {
		const destination = await createTeamProject();
		const { read } = await peer.transaction(async (manager) => {
			await manager.delete(SharedWorkflow, { workflowId: workflow.id, projectId: project.id });
			const read = Promise.allSettled([
				tx.run(
					{},
					async (ctx) =>
						await Container.get(WorkflowSuggestionService).readWorkflowTargetForApply(
							workflow.id,
							ctx,
						),
				),
			]);
			await vi.waitFor(async () => {
				const rows = await manager.query<Array<{ blocked: boolean }>>(
					`SELECT EXISTS (
						SELECT 1 FROM pg_stat_activity
						WHERE pg_backend_pid() = ANY(pg_blocking_pids(pid))
					) AS blocked`,
				);
				expect(rows).toEqual([{ blocked: true }]);
			});
			await manager.insert(SharedWorkflow, {
				workflowId: workflow.id,
				projectId: destination.id,
				role: 'workflow:owner',
			});
			return { read };
		});
		const [result] = await read;
		if (result.status === 'rejected') throw result.reason;
		expect(result.value.projectId).not.toBe(project.id);
	});
});
