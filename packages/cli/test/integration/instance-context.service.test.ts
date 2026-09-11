import {
	createActiveWorkflow,
	createTeamProject,
	createWorkflow,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { ActivityEventRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { InstanceContextService } from '@/modules/instance-ai/instance-context.service';
import type {
	InstanceContextCursor,
	InstanceContextResult,
} from '@/modules/instance-ai/instance-context.service';

import { createExecution } from '@test-integration/db/executions';
import { createMember } from '@test-integration/db/users';

describe('InstanceContextService', () => {
	let service: InstanceContextService;
	let activity: ActivityEventRepository;
	let user: User;
	let project: Project;
	let otherProject: Project;

	const recently = () => new Date(Date.now() - 60_000);

	/** Reads an injected result's block, asserting the state on the way through. */
	function blockOf(result: InstanceContextResult): string {
		expect(result.state).toBe('injected');
		if (result.state !== 'injected') throw new Error('expected an injected block');
		return result.block;
	}

	function cursorOf(result: InstanceContextResult): InstanceContextCursor {
		expect(result.state).toBe('injected');
		if (result.state !== 'injected') throw new Error('expected an injected block');
		return result.cursor;
	}

	beforeAll(async () => {
		await testDb.init();
		service = Container.get(InstanceContextService);
		activity = Container.get(ActivityEventRepository);
		user = await createMember();
		project = await createTeamProject(undefined, user);
		otherProject = await createTeamProject();
	});

	beforeEach(
		async () => await testDb.truncate(['ActivityEvent', 'ExecutionEntity', 'WorkflowEntity']),
	);
	afterAll(async () => await testDb.terminate());

	/** `userId` is foreign-keyed, so an entry needs a real user to belong to. */
	async function record(overrides: Parameters<ActivityEventRepository['record']>[0]) {
		await activity.record({ userId: user.id, ...overrides });
	}

	it('carries what exists, what changed and what ran, in one block', async () => {
		const workflow = await createActiveWorkflow({ name: 'Lead enrichment' }, project);
		await record({
			category: 'workflow',
			action: 'saved',
			projectId: project.id,
			resourceType: 'workflow',
			resourceId: workflow.id,
			resourceName: workflow.name,
			data: { source: 'ui', nodesAdded: ['slack'], nodesAddedTotal: 1 },
		});
		await createExecution({ status: 'error', stoppedAt: recently() }, workflow);

		const built = await service.buildBlock({
			user,
			projectId: project.id,
			cursor: null,
			enabled: true,
		});

		expect(blockOf(built)).toContain('Workflows in this project: 1');
		expect(blockOf(built)).toContain(
			'"Lead enrichment" (workflow:' + workflow.id + ') [published]',
		);
		expect(blockOf(built)).toContain('ran 1×, 1 failed');
		expect(blockOf(built)).toContain('+1 slack');
	});

	it('builds nothing with the reader disabled', async () => {
		await createWorkflow({ name: 'Lead enrichment' }, project);

		expect(
			await service.buildBlock({ user, projectId: project.id, cursor: null, enabled: false }),
		).toMatchObject({ state: 'absent', reason: 'disabled' });
	});

	describe('scoping', () => {
		it("never shows another project's work, on any leg", async () => {
			const theirs = await createWorkflow({ name: 'Their secret plan' }, otherProject);
			await record({
				category: 'workflow',
				action: 'deleted',
				projectId: otherProject.id,
				resourceType: 'workflow',
				resourceId: 'gone-1',
				resourceName: 'Their deleted workflow',
			});
			await createExecution({ status: 'error', stoppedAt: recently() }, theirs);

			// Something of ours, so the block is built at all and the absence is meaningful.
			await createWorkflow({ name: 'Ours' }, project);

			const built = await service.buildBlock({
				user,
				projectId: project.id,
				cursor: null,
				enabled: true,
			});

			expect(blockOf(built)).toContain('Ours');
			expect(blockOf(built)).not.toContain('Their secret plan');
			expect(blockOf(built)).not.toContain('Their deleted workflow');
			expect(blockOf(built)).toContain('Workflows in this project: 1');
		});

		it('returns nothing for an entry in a project the user cannot see', async () => {
			await record({
				category: 'workflow',
				action: 'saved',
				projectId: otherProject.id,
				resourceType: 'workflow',
				resourceId: 'wf-theirs',
			});
			const [entry] = await activity.findFeed({ projectIds: [otherProject.id], limit: 1 });

			// Scoped to the user's own project, so the other project's entry is out of reach.
			expect(await service.expand({ id: entry.id, user, projectId: project.id })).toBeNull();
			// A pruned id answers identically, so the tool cannot probe for existence.
			expect(
				await service.expand({ id: entry.id + 5_000, user, projectId: project.id }),
			).toBeNull();
		});
	});

	describe('deltas', () => {
		/**
		 * The correctness property behind the delta cursor. Ids are allocated outside the
		 * surrounding transaction on Postgres, so a lower id can commit after a higher one has
		 * already been shown. The reader therefore re-reads a band below its mark and drops what it
		 * has already shown, rather than asking for "everything above the highest id seen" — which
		 * would skip the straggler for good, and deletions are written by whichever request happens
		 * to be committing.
		 *
		 * The mark below stands for that state: an entry sitting under it that no block has shown.
		 */
		it('shows an entry that sits behind the high-water mark and was never shown', async () => {
			for (const name of ['Committed late', 'Also late', 'Seen already']) {
				await record({
					category: 'workflow',
					action: 'saved',
					projectId: project.id,
					resourceType: 'workflow',
					resourceId: `wf-${name}`,
					resourceName: name,
				});
			}
			const [newest] = await activity.findFeed({ projectIds: [project.id], limit: 1 });

			const delta = await service.buildBlock({
				user,
				projectId: project.id,
				cursor: {
					activityMark: newest.id,
					activitySeen: [newest.id],
					runsThrough: new Date().toISOString(),
				},
				enabled: true,
			});

			expect(blockOf(delta)).toContain('Committed late');
			expect(blockOf(delta)).toContain('Also late');
			// The one the mark accounted for is not repeated.
			expect(blockOf(delta)).not.toContain('Seen already');
		});

		it('leaves the inventory out of a delta and says it is an addition', async () => {
			await createWorkflow({ name: 'Lead enrichment' }, project);
			await record({
				category: 'workflow',
				action: 'created',
				projectId: project.id,
				resourceType: 'workflow',
				resourceId: 'wf-1',
				resourceName: 'Lead enrichment',
			});

			const first = await service.buildBlock({
				user,
				projectId: project.id,
				cursor: null,
				enabled: true,
			});
			const firstCursor = cursorOf(first);
			await record({
				category: 'credential',
				action: 'created',
				projectId: project.id,
				resourceType: 'credential',
				resourceId: 'cred-1',
				resourceName: 'Slack account',
				data: { credentialType: 'slackApi' },
			});

			const delta = await service.buildBlock({
				user,
				projectId: project.id,
				cursor: firstCursor,
				enabled: true,
			});

			expect(blockOf(delta)).toContain('Slack account');
			expect(blockOf(delta)).toContain('since the list earlier in this conversation');
			expect(blockOf(delta)).not.toContain('Workflows in this project');
		});

		it('builds nothing when nothing has happened since the last block', async () => {
			await createWorkflow({ name: 'Lead enrichment' }, project);

			const opening = await service.buildBlock({
				user,
				projectId: project.id,
				cursor: null,
				enabled: true,
			});

			expect(
				await service.buildBlock({
					user,
					projectId: project.id,
					cursor: cursorOf(opening),
					enabled: true,
				}),
			).toMatchObject({ state: 'absent', reason: 'empty' });
		});
	});

	/** An evaluation suite is machine-paced and would bury everything a person did. */
	/**
	 * Thread access proves the thread is the caller's own, not that they may still read the project
	 * it is bound to, so the scope is re-checked against the real permission tables every turn.
	 */
	it('builds nothing when the bound project is one the user cannot read', async () => {
		await createWorkflow({ name: 'Theirs' }, otherProject);

		const built = await service.buildBlock({
			user,
			projectId: otherProject.id,
			cursor: null,
			enabled: true,
		});

		// `empty` rather than a scope-specific reason on purpose: an out-of-scope project has
		// to be indistinguishable from one that simply holds nothing, or the absence itself
		// answers whether a project the caller cannot read has work in it.
		expect(built).toMatchObject({ state: 'absent', reason: 'empty' });
	});

	it('leaves evaluation runs out of the block', async () => {
		const workflow = await createWorkflow({ name: 'Lead enrichment' }, project);
		await createExecution({ status: 'error', mode: 'evaluation', stoppedAt: recently() }, workflow);

		const built = await service.buildBlock({
			user,
			projectId: project.id,
			cursor: null,
			enabled: true,
		});

		expect(blockOf(built)).not.toContain('ran ');
	});

	it("expands an entry with the rest of that resource's history", async () => {
		for (const action of ['created', 'saved']) {
			await record({
				category: 'workflow',
				action,
				projectId: project.id,
				resourceType: 'workflow',
				resourceId: 'wf-1',
				resourceName: 'Lead enrichment',
			});
		}
		const [newest] = await activity.findFeed({ projectIds: [project.id], limit: 1 });

		const expansion = await service.expand({
			id: newest.id,
			user,
			projectId: project.id,
		});

		expect(expansion?.entry.action).toBe('saved');
		expect(expansion?.resourceHistory.map((other) => other.action)).toEqual(['created']);
		expect(expansion?.liveRecordHint).toBe('workflows(action="get", workflowId="wf-1")');
	});

	it('reads nothing when the conversation is bound to no project', async () => {
		await createWorkflow({ name: 'Mine' }, project);
		await record({
			category: 'workflow',
			action: 'saved',
			projectId: project.id,
			resourceType: 'workflow',
			resourceId: 'wf-1',
		});

		expect(await service.buildBlock({ user, cursor: null, enabled: true })).toMatchObject({
			state: 'absent',
			reason: 'empty',
		});
	});
});
