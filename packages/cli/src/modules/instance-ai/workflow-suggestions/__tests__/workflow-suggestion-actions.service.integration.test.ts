import {
	createTeamProject,
	createWorkflowWithHistory,
	mockInstance,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import {
	ProjectRepository,
	ProjectRelationRepository,
	SharedWorkflowRepository,
	TransactionRunner,
	UserRepository,
	WorkflowEntity,
	WorkflowHistoryRepository,
	WorkflowPublicationTriggerStatusRepository,
	WorkflowPublicationOutboxRepository,
	WorkflowPublishHistoryRepository,
	WorkflowRepository,
	postgresMigrations,
	sqliteMigrations,
	wrapMigration,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { ConflictError } from '@n8n/errors';
import { DataSource } from '@n8n/typeorm';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { calculateWorkflowChecksum } from 'n8n-workflow';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { CollaborationService } from '@/collaboration/collaboration.service';
import { ExternalHooks } from '@/external-hooks';
import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { WorkflowValidationService } from '@/workflows/workflow-validation.service';
import { WorkflowService } from '@/workflows/workflow.service';
import { WorkflowPublicationNotifier } from '@/workflows/publication/workflow-publication-notifier';
import { WorkflowPublishGuardProxy } from '@/workflows/workflow-publish-guard-proxy.service';
import { createUser } from '@test-integration/db/users';
import { initNodeTypes, setupTestServer } from '@test-integration/utils';

import { WorkflowSuggestionActivity } from '../database/workflow-suggestion-activity.entity';
import { WorkflowSuggestion } from '../database/workflow-suggestion.entity';
import { WorkflowSuggestionRepository } from '../database/workflow-suggestion.repository';
import { WorkflowSuggestionActionsService } from '../workflow-suggestion-actions.service';
import { WorkflowSuggestionService } from '../workflow-suggestion.service';

mockInstance(ActiveWorkflowManager);
mockInstance(WorkflowPublicationNotifier);
const validation = mockInstance(WorkflowValidationService);

setupTestServer({
	modules: ['instance-ai'],
	setupTimeout: 30_000,
});

let actions: WorkflowSuggestionActionsService;
let suggestions: WorkflowSuggestionRepository;
let suggestionService: WorkflowSuggestionService;
let workflows: WorkflowRepository;
let history: WorkflowHistoryRepository;
let workflowService: WorkflowService;

beforeAll(async () => {
	await initNodeTypes();
	actions = Container.get(WorkflowSuggestionActionsService);
	suggestions = Container.get(WorkflowSuggestionRepository);
	suggestionService = Container.get(WorkflowSuggestionService);
	workflows = Container.get(WorkflowRepository);
	history = Container.get(WorkflowHistoryRepository);
	workflowService = Container.get(WorkflowService);
});

beforeEach(() => {
	Container.get(GlobalConfig).workflows.useWorkflowPublicationService = true;
	validation.validateTriggerNodeIds.mockReturnValue({ isValid: true });
	validation.validateForActivation.mockReturnValue({ isValid: true });
	validation.validateDynamicCredentials.mockResolvedValue({ isValid: true });
	validation.validatePublisherCredentialAccess.mockResolvedValue({ isValid: true });
	validation.validateSubWorkflowReferences.mockResolvedValue({ isValid: true });
	validation.validateCredentialNodeRestrictions.mockReturnValue({ isValid: true });
});

afterEach(async () => {
	vi.restoreAllMocks();
	await Container.get(DataSource).getRepository(WorkflowSuggestionActivity).clear();
	await suggestions.createQueryBuilder().delete().execute();
});

async function prepareFixture(resultKind: 'fix_ready' | 'needs_you' = 'fix_ready') {
	const user = await createUser();
	const workflow = await createWorkflowWithHistory({}, user);
	await workflows.update(workflow.id, { activeVersionId: workflow.versionId, active: true });
	await Container.get(WorkflowPublicationTriggerStatusRepository).replaceForWorkflow(workflow.id, [
		{
			nodeId: workflow.nodes[0].id,
			versionId: workflow.versionId,
			status: 'activated',
			triggerKind: 'persisted',
			errorMessage: null,
		},
	]);
	const original = await workflows.findOneByOrFail({ id: workflow.id });
	const project = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(user.id);
	const baseline = await suggestionService.captureBaseline(workflow.id, user.id);
	const graph = {
		nodes: original.nodes.map((node) => ({ ...node, position: [100, 100] as [number, number] })),
		connections: original.connections,
	};
	const prepared = await suggestionService.prepareSuggestion(baseline, {
		graph,
		explanation: 'Update the workflow graph.',
		resultKind,
	});
	return { user, workflow, original, project, graph, prepared };
}

async function fixture(resultKind: 'fix_ready' | 'needs_you' = 'fix_ready') {
	const { user, workflow, original, project, graph, prepared } = await prepareFixture(resultKind);
	const suggestion = await suggestionService.createSuggestion(prepared);
	const act = async (action: Parameters<WorkflowSuggestionActionsService['act']>[4]) =>
		await actions.act(user, project.id, workflow.id, suggestion.id, action);
	return { user, workflow, original, project, graph, suggestion, act };
}

it('opens the applied version in the editor without changing the published version', async () => {
	const { original, graph, suggestion, act } = await fixture();
	const beforeHistory = await history.countBy({ workflowId: original.id });

	const detail = await act('open-in-editor');

	const saved = await workflows.findOneByOrFail({ id: original.id });
	expect(saved.nodes).toEqual(graph.nodes);
	expect(saved.connections).toEqual(graph.connections);
	expect(saved.versionId).not.toBe(original.versionId);
	expect(saved.activeVersionId).toBe(original.activeVersionId);
	expect(await history.countBy({ workflowId: original.id })).toBe(beforeHistory + 1);
	expect(detail).toMatchObject({ state: 'closed', closedReason: 'applied' });
	expect(await suggestions.findOneByOrFail({ id: suggestion.id })).toMatchObject({
		appliedVersion: { versionId: saved.versionId },
		payload: suggestion.payload,
	});
});

it('returns the applied version when the same action is repeated', async () => {
	const { original, suggestion, act } = await fixture();
	await act('open-in-editor');
	const saved = await workflows.findOneByOrFail({ id: original.id });
	const beforeHistory = await history.countBy({ workflowId: original.id });
	const beforeActivity = await suggestions.getActivity(suggestion.id);

	await act('open-in-editor');

	expect(await workflows.findOneByOrFail({ id: original.id })).toEqual(saved);
	expect(await history.countBy({ workflowId: original.id })).toBe(beforeHistory);
	expect(await suggestions.getActivity(suggestion.id)).toEqual(beforeActivity);
});

it('saves one version when two requests apply the same proposal at once', async () => {
	const { original, suggestion, act } = await fixture();
	const beforeHistory = await history.countBy({ workflowId: original.id });

	const results = await Promise.allSettled([act('open-in-editor'), act('open-in-editor')]);
	const saved = await workflows.findOneByOrFail({ id: original.id });

	expect(results.some(({ status }) => status === 'fulfilled')).toBe(true);
	for (const result of results) {
		if (result.status === 'rejected') expect(result.reason).toBeInstanceOf(ConflictError);
		else expect(result.value.appliedVersion?.versionId).toBe(saved.versionId);
	}
	expect(saved.versionId).not.toBe(original.versionId);
	expect(await history.countBy({ workflowId: original.id })).toBe(beforeHistory + 1);
	expect(
		(await suggestions.getActivity(suggestion.id)).filter(({ action }) => action === 'applied'),
	).toHaveLength(1);
});

it('publishes the committed application once when an after-update hook fails', async () => {
	const { original, suggestion, act } = await fixture();
	const beforeHistory = await history.countBy({ workflowId: original.id });
	const publish = vi.spyOn(workflowService, 'activateWorkflow');
	let appliedVersionAtHook: string | undefined;
	vi.spyOn(Container.get(ExternalHooks), 'run').mockImplementation(async (name) => {
		if (name === 'workflow.afterUpdate') {
			const committed = await suggestions.findOneByOrFail({ id: suggestion.id });
			appliedVersionAtHook = committed.appliedVersion?.versionId;
			throw new Error('After-update hook failed.');
		}
	});

	const detail = await act('approve-and-publish');

	expect(detail).toMatchObject({ state: 'closed', closedReason: 'applied' });
	expect(publish).toHaveBeenCalledOnce();
	expect(detail.publishError).toBeUndefined();
	expect(appliedVersionAtHook).toBe(detail.appliedVersion?.versionId);
	expect(appliedVersionAtHook).toBeDefined();
	expect(detail.appliedVersion?.versionId).toBe(
		(await workflows.findOneByOrFail({ id: original.id })).versionId,
	);
	await act('approve-and-publish');
	expect(publish).toHaveBeenCalledOnce();
	expect(await history.countBy({ workflowId: original.id })).toBe(beforeHistory + 1);
});

it('rejects applying a Needs attention result', async () => {
	const { original, suggestion, act } = await fixture('needs_you');
	const beforeHistory = await history.countBy({ workflowId: original.id });

	await expect(act('open-in-editor')).rejects.toThrow();

	expect(await workflows.findOneByOrFail({ id: original.id })).toEqual(original);
	expect(await history.countBy({ workflowId: original.id })).toBe(beforeHistory);
	expect(await suggestions.findOneByOrFail({ id: suggestion.id })).toMatchObject({
		state: 'pending',
	});
});

it('discards a proposal without saving its graph or changing its stored content', async () => {
	const { original, suggestion, act } = await fixture();
	const beforeHistory = await history.countBy({ workflowId: original.id });

	await act('discard');
	const activity = await suggestions.getActivity(suggestion.id);
	await act('discard');

	expect(await workflows.findOneByOrFail({ id: original.id })).toEqual(original);
	expect(await history.countBy({ workflowId: original.id })).toBe(beforeHistory);
	expect(await suggestions.findOneByOrFail({ id: suggestion.id })).toMatchObject({
		state: 'closed',
		closedReason: 'discarded',
		payload: suggestion.payload,
	});
	expect(await suggestions.getActivity(suggestion.id)).toEqual(activity);
});

it('restores the suggestion and activity when the caller rolls back a discard', async () => {
	const { user, original, project, suggestion } = await fixture();
	const beforeActivity = await suggestions.getActivity(suggestion.id);
	const scope = { workflowId: original.id, projectId: project.id };
	const beforeSuggestion = await suggestions.getSuggestion(suggestion.id, scope);

	await expect(
		Container.get(TransactionRunner).run({}, async (ctx) => {
			await actions.discard(user, project.id, original.id, suggestion.id, ctx);
			expect(await suggestions.getSuggestion(suggestion.id, scope, ctx)).toMatchObject({
				state: 'closed',
				closedReason: 'discarded',
			});
			throw new Error('Caller transaction failed.');
		}),
	).rejects.toThrow('Caller transaction failed.');

	expect(await suggestions.getSuggestion(suggestion.id, scope)).toEqual(beforeSuggestion);
	expect(await suggestions.getActivity(suggestion.id)).toEqual(beforeActivity);
});

it('keeps a moved proposal outdated when discard rejects the old project', async () => {
	const { user, original, project, suggestion, act } = await fixture();
	const destination = await createTeamProject(undefined, user);
	await Container.get(SharedWorkflowRepository).update(
		{ workflowId: original.id, projectId: project.id },
		{ projectId: destination.id },
	);

	await expect(act('discard')).rejects.toThrow('Suggestion not found.');

	expect(await suggestions.findOneByOrFail({ id: suggestion.id })).toMatchObject({
		state: 'closed',
		closedReason: 'outdated',
		appliedVersion: null,
	});
	expect((await suggestions.getActivity(suggestion.id)).map(({ action }) => action)).toEqual([
		'submitted',
		'outdated',
	]);
	expect(await workflows.findOneByOrFail({ id: original.id })).toEqual(original);
});

it('creates and discards a suggestion in the caller transaction', async () => {
	const { user, original, project, prepared } = await prepareFixture();
	const scope = { workflowId: original.id, projectId: project.id };

	const suggestion = await Container.get(TransactionRunner).run({}, async (ctx) => {
		const created = await suggestionService.createSuggestion(prepared, ctx);
		await actions.discard(user, project.id, original.id, created.id, ctx);
		expect(await suggestions.getSuggestion(created.id, scope, ctx)).toMatchObject({
			state: 'closed',
			closedReason: 'discarded',
		});
		return created;
	});

	expect(await suggestions.getSuggestion(suggestion.id, scope)).toMatchObject({
		state: 'closed',
		closedReason: 'discarded',
		payload: suggestion.payload,
	});
	const activity = await suggestions.getActivity(suggestion.id);
	expect(activity).toEqual(
		expect.arrayContaining([
			expect.objectContaining({ action: 'submitted', author: 'assistant', actorId: null }),
			expect.objectContaining({ action: 'discarded', author: 'human', actorId: user.id }),
		]),
	);
	expect(activity).toHaveLength(2);
});

it.each(['disabled', 'unrelated'] as const)(
	'rejects a caller-transaction discard by a %s user',
	async (access) => {
		const { user, original, project, suggestion } = await fixture();
		const actor = access === 'disabled' ? user : await createUser();
		if (access === 'disabled') {
			await Container.get(UserRepository).update(actor.id, { disabled: true });
		}
		const scope = { workflowId: original.id, projectId: project.id };
		const beforeSuggestion = await suggestions.getSuggestion(suggestion.id, scope);
		const beforeActivity = await suggestions.getActivity(suggestion.id);

		await Container.get(TransactionRunner).run({}, async (ctx) => {
			await expect(
				actions.discard(actor, project.id, original.id, suggestion.id, ctx),
			).rejects.toThrow('edit access');
			expect(await suggestions.getSuggestion(suggestion.id, scope, ctx)).toEqual(beforeSuggestion);
		});

		expect(await suggestions.getSuggestion(suggestion.id, scope)).toEqual(beforeSuggestion);
		expect(await suggestions.getActivity(suggestion.id)).toEqual(beforeActivity);
	},
);

it('closes a proposal as outdated after settings change without a new version', async () => {
	const { user, original, project, suggestion, act } = await fixture();
	await workflows.update(original.id, { settings: { executionTimeout: 45 } });

	const detail = await suggestionService.refreshProposal(
		user,
		project.id,
		original.id,
		suggestion.id,
	);

	expect(detail).toMatchObject({ state: 'closed', closedReason: 'outdated' });
	expect(await act('open-in-editor')).toMatchObject({ state: 'closed', closedReason: 'outdated' });
	expect((await workflows.findOneByOrFail({ id: original.id })).versionId).toBe(original.versionId);
});

it('closes a proposal after publication changes even if the original version is live again', async () => {
	const { user, original, project, suggestion, act } = await fixture();
	const publications = Container.get(WorkflowPublishHistoryRepository);
	for (const event of ['deactivated', 'activated'] as const) {
		await publications.addRecord({
			workflowId: original.id,
			versionId: original.versionId,
			event,
			userId: user.id,
		});
	}

	const detail = await suggestionService.refreshProposal(
		user,
		project.id,
		original.id,
		suggestion.id,
	);

	expect(detail).toMatchObject({ state: 'closed', closedReason: 'outdated' });
	expect(await act('open-in-editor')).toMatchObject({ state: 'closed', closedReason: 'outdated' });
	expect(await workflows.findOneByOrFail({ id: original.id })).toEqual(original);
});

it('keeps the workflow, history, and proposal unchanged when save policy rejects the graph', async () => {
	const { original, suggestion, act } = await fixture();
	const beforeHistory = await history.countBy({ workflowId: original.id });
	vi.spyOn(Container.get(PolicyEnforcementService), 'enforceWorkflowSave').mockRejectedValueOnce(
		new Error('The workflow does not meet the save policy.'),
	);

	await expect(act('open-in-editor')).rejects.toThrow('save policy');

	expect(await workflows.findOneByOrFail({ id: original.id })).toEqual(original);
	expect(await history.countBy({ workflowId: original.id })).toBe(beforeHistory);
	expect(await suggestions.findOneByOrFail({ id: suggestion.id })).toMatchObject({
		state: 'pending',
	});
	expect(await suggestions.getActivity(suggestion.id)).toHaveLength(1);
});

it.each(['nodes', 'staticData'] as const)(
	'rejects save preparation that changes the reviewed %s',
	async (field) => {
		const { original, suggestion, act } = await fixture();
		const beforeHistory = await history.countBy({ workflowId: original.id });
		vi.spyOn(Container.get(ExternalHooks), 'run').mockImplementation(async (name, parameters) => {
			if (name !== 'workflow.update') return;
			const update = parameters?.[0] as WorkflowEntity;
			if (field === 'nodes') {
				update.nodes[0].position = [900, 900];
			} else {
				update.staticData = { global: { lastId: 'changed-by-hook' } };
			}
		});

		await expect(act('open-in-editor')).rejects.toThrow('save preparation');

		expect(await workflows.findOneByOrFail({ id: original.id })).toEqual(original);
		expect(await history.countBy({ workflowId: original.id })).toBe(beforeHistory);
		expect(await suggestions.findOneByOrFail({ id: suggestion.id })).toMatchObject({
			state: 'pending',
			appliedVersion: null,
		});
	},
);

it('leaves the proposal pending when another editor holds the write lock', async () => {
	const { original, suggestion, act } = await fixture();
	const beforeHistory = await history.countBy({ workflowId: original.id });
	vi.spyOn(Container.get(CollaborationService), 'validateWriteLock').mockRejectedValueOnce(
		new Error('The workflow is locked by another editor.'),
	);

	await expect(act('open-in-editor')).rejects.toThrow('locked');

	expect(await workflows.findOneByOrFail({ id: original.id })).toEqual(original);
	expect(await history.countBy({ workflowId: original.id })).toBe(beforeHistory);
	expect(await suggestions.findOneByOrFail({ id: suggestion.id })).toMatchObject({
		state: 'pending',
	});
});

it('checks the current user state before applying or discarding', async () => {
	const { user, original, suggestion, act } = await fixture();
	await Container.get(UserRepository).update(user.id, { disabled: true });

	await expect(act('open-in-editor')).rejects.toThrow();
	await expect(act('discard')).rejects.toThrow();

	expect(await workflows.findOneByOrFail({ id: original.id })).toEqual(original);
	expect(await suggestions.findOneByOrFail({ id: suggestion.id })).toMatchObject({
		state: 'pending',
	});
});

it.each(['disabled user', 'removed membership'] as const)(
	'rechecks edit access after preparation for a %s',
	async (access) => {
		const { user, original, project, suggestion, act } = await fixture();
		const beforeHistory = await history.countBy({ workflowId: original.id });
		const beforeActivity = await suggestions.getActivity(suggestion.id);
		vi.spyOn(Container.get(ExternalHooks), 'run').mockImplementation(async (name) => {
			if (name !== 'workflow.update') return;
			if (access === 'disabled user') {
				await Container.get(UserRepository).update(user.id, { disabled: true });
			} else {
				await Container.get(ProjectRelationRepository).delete({
					userId: user.id,
					projectId: project.id,
				});
			}
		});

		await expect(act('open-in-editor')).rejects.toThrow('edit access');

		expect(await workflows.findOneByOrFail({ id: original.id })).toEqual(original);
		expect(await history.countBy({ workflowId: original.id })).toBe(beforeHistory);
		expect(await suggestions.findOneByOrFail({ id: suggestion.id })).toEqual(suggestion);
		expect(await suggestions.getActivity(suggestion.id)).toEqual(beforeActivity);
	},
);

it('rolls back the graph and history when the action activity cannot be saved', async () => {
	const { original, suggestion, act } = await fixture();
	const beforeHistory = await history.countBy({ workflowId: original.id });
	vi.spyOn(suggestions, 'appendActivity').mockRejectedValueOnce(new Error('Activity unavailable.'));

	await expect(act('open-in-editor')).rejects.toThrow('Activity unavailable.');

	expect(await workflows.findOneByOrFail({ id: original.id })).toEqual(original);
	expect(await history.countBy({ workflowId: original.id })).toBe(beforeHistory);
	expect(await suggestions.findOneByOrFail({ id: suggestion.id })).toMatchObject({
		state: 'pending',
		appliedVersion: null,
	});
	expect(await suggestions.getActivity(suggestion.id)).toHaveLength(1);
});

it('resolves concurrent apply and discard actions to one terminal state', async () => {
	const { original, graph, suggestion, act } = await fixture();
	const beforeHistory = await history.countBy({ workflowId: original.id });

	const outcomes = await Promise.allSettled([act('open-in-editor'), act('discard')]);
	const stored = await suggestions.findOneByOrFail({ id: suggestion.id });
	const saved = await workflows.findOneByOrFail({ id: original.id });
	expect(stored.state).toBe('closed');
	expect(['applied', 'discarded']).toContain(stored.closedReason);
	expect(outcomes[1].status).toBe('fulfilled');
	for (const outcome of outcomes) {
		if (outcome.status === 'rejected') expect(outcome.reason).toBeInstanceOf(ConflictError);
		else expect(outcome.value.closedReason).toBe(stored.closedReason);
	}
	expect((await suggestions.getActivity(suggestion.id)).map(({ action }) => action)).toEqual([
		'submitted',
		stored.closedReason,
	]);
	expect(saved.nodes).toEqual(stored.closedReason === 'applied' ? graph.nodes : original.nodes);
	expect(await history.countBy({ workflowId: original.id })).toBe(
		beforeHistory + (stored.closedReason === 'applied' ? 1 : 0),
	);
	expect(saved.activeVersionId).toBe(original.activeVersionId);
});

it.skipIf(process.env.DB_TYPE !== 'postgresdb')(
	'rolls back Apply when another connection discards the suggestion before it closes',
	async () => {
		const { original, suggestion, user, act } = await fixture();
		const beforeHistory = await history.countBy({ workflowId: original.id });
		const peer = await new DataSource({
			...Container.get(DataSource).options,
			synchronize: false,
			migrationsRun: false,
			dropSchema: false,
		}).initialize();
		const closePending = suggestions.closePending.bind(suggestions);
		vi.spyOn(suggestions, 'closePending').mockImplementationOnce(async (...args) => {
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
				await manager.save(
					manager.create(WorkflowSuggestionActivity, {
						suggestionId: suggestion.id,
						action: 'discarded',
						author: 'human',
						actorId: user.id,
					}),
				);
			});
			return await closePending(...args);
		});
		try {
			await expect(act('open-in-editor')).rejects.toThrow('The suggestion has already closed.');
			expect(await suggestions.findOneByOrFail({ id: suggestion.id })).toMatchObject({
				closedReason: 'discarded',
				appliedVersion: null,
			});
			expect(await workflows.findOneByOrFail({ id: original.id })).toEqual(original);
			expect(await history.countBy({ workflowId: original.id })).toBe(beforeHistory);
			expect((await suggestions.getActivity(suggestion.id)).map(({ action }) => action)).toEqual([
				'submitted',
				'discarded',
			]);
		} finally {
			await peer.destroy();
		}
	},
);

it('rejects an intervening edit and closes the suggestion only on refresh', async () => {
	const { user, original, project, graph, suggestion, act } = await fixture();
	const editorNodes = original.nodes.map((node) => ({
		...node,
		position: [300, 300] as [number, number],
	}));
	const prepared = createDeferredPromise();
	const resume = createDeferredPromise();
	vi.spyOn(Container.get(ExternalHooks), 'run').mockImplementation(async (name, parameters) => {
		if (name !== 'workflow.update') return;
		const update = parameters?.[0] as WorkflowEntity;
		if (update.nodes[0].position[0] !== graph.nodes[0].position[0]) return;
		prepared.resolve();
		await resume.promise;
	});
	const beforeHistory = await history.countBy({ workflowId: original.id });
	const apply = act('open-in-editor');
	const rejected = expect(apply).rejects.toThrow('no longer matches');
	await prepared.promise;
	try {
		const editorSave = await workflowService.update(
			user,
			Object.assign(new WorkflowEntity(), {
				nodes: editorNodes,
				connections: original.connections,
			}),
			original.id,
			{ expectedChecksum: await calculateWorkflowChecksum(original) },
		);
		resume.resolve();
		await rejected;

		const saved = await workflows.findOneByOrFail({ id: original.id });
		expect(saved.nodes).toEqual(editorNodes);
		expect(saved.versionId).toBe(editorSave.versionId);
		expect(saved.activeVersionId).toBe(original.activeVersionId);
		expect(await history.countBy({ workflowId: original.id })).toBe(beforeHistory + 1);
		expect(await suggestions.findOneByOrFail({ id: suggestion.id })).toMatchObject({
			state: 'pending',
			appliedVersion: null,
		});
		expect((await suggestions.getActivity(suggestion.id)).map(({ action }) => action)).toEqual([
			'submitted',
		]);
		expect(
			await suggestionService.refreshProposal(user, project.id, original.id, suggestion.id),
		).toMatchObject({ state: 'closed', closedReason: 'outdated' });
		expect(
			(await suggestions.getActivity(suggestion.id)).map(({ action }) => action).sort(),
		).toEqual(['outdated', 'submitted']);
	} finally {
		resume.resolve();
	}
});

it('requests normal publication of the applied version and does not repeat it', async () => {
	const { user, original, suggestion, act } = await fixture();
	const publish = vi.spyOn(workflowService, 'activateWorkflow');
	let notifiedWorkflow: WorkflowEntity | undefined;
	const notify = vi
		.spyOn(Container.get(CollaborationService), 'broadcastWorkflowUpdate')
		.mockImplementation(async (workflowId) => {
			notifiedWorkflow = await workflows.findOneByOrFail({ id: workflowId });
		});
	const detail = await act('approve-and-publish');
	const saved = await workflows.findOneByOrFail({ id: original.id });
	const beforeHistory = await history.countBy({ workflowId: original.id });

	expect(detail).toMatchObject({
		closedReason: 'applied',
		appliedVersion: { versionId: saved.versionId },
	});
	expect(detail.publishError).toBeUndefined();
	expect(publish).toHaveBeenCalledExactlyOnceWith(
		expect.objectContaining({ id: user.id }),
		original.id,
		{
			versionId: saved.versionId,
			expectedChecksum: detail.appliedVersion?.checksum,
			source: 'n8n-ai',
		},
	);
	expect(
		await Container.get(WorkflowPublicationOutboxRepository).findInFlightByWorkflowId(original.id),
	).toMatchObject({ publishedVersionId: saved.versionId });
	expect(saved.activeVersionId).toBe(saved.versionId);
	expect(notifiedWorkflow).toMatchObject({
		versionId: saved.versionId,
		activeVersionId: saved.versionId,
	});
	expect(notify).toHaveBeenCalledExactlyOnceWith(original.id, user.id);
	expect(detail).not.toHaveProperty('publication');

	await act('approve-and-publish');
	expect(publish).toHaveBeenCalledTimes(1);
	expect(notify).toHaveBeenCalledTimes(1);
	expect(await history.countBy({ workflowId: original.id })).toBe(beforeHistory);
	expect((await suggestions.getActivity(suggestion.id)).map(({ action }) => action)).toEqual([
		'submitted',
		'applied',
	]);
});

it('keeps the fix applied when the normal publication guard rejects it', async () => {
	const { user, original, suggestion, act } = await fixture();
	const publish = vi.spyOn(workflowService, 'activateWorkflow');
	const notify = vi.spyOn(Container.get(CollaborationService), 'broadcastWorkflowUpdate');
	vi.spyOn(Container.get(WorkflowPublishGuardProxy), 'assertCanPublish').mockRejectedValueOnce(
		new Error('An open review blocks publication.'),
	);

	const detail = await act('approve-and-publish');
	const saved = await workflows.findOneByOrFail({ id: original.id });
	expect(detail).toMatchObject({
		closedReason: 'applied',
		publishError: 'An open review blocks publication.',
	});
	expect(saved.versionId).toBe(detail.appliedVersion?.versionId);
	expect(saved.activeVersionId).toBe(original.activeVersionId);
	expect(notify).toHaveBeenCalledExactlyOnceWith(original.id, user.id);
	expect(await suggestions.findOneByOrFail({ id: suggestion.id })).toMatchObject({
		closedReason: 'applied',
	});
	await act('approve-and-publish');
	expect(publish).toHaveBeenCalledTimes(1);
});

it('returns the applied fix and request error when publication was already queued', async () => {
	const { original, act } = await fixture();
	const activate = workflowService.activateWorkflow.bind(workflowService);
	const publish = vi
		.spyOn(workflowService, 'activateWorkflow')
		.mockImplementationOnce(async (...args) => {
			await activate(...args);
			throw new Error('Response unavailable.');
		});

	const detail = await act('approve-and-publish');
	expect(detail).toMatchObject({
		closedReason: 'applied',
		publishError: 'Response unavailable.',
	});
	expect(
		await Container.get(WorkflowPublicationOutboxRepository).findInFlightByWorkflowId(original.id),
	).toMatchObject({ publishedVersionId: detail.appliedVersion?.versionId });
	expect(await act('approve-and-publish')).toMatchObject({ appliedVersion: detail.appliedVersion });
	expect(publish).toHaveBeenCalledTimes(1);
});

it('starts publication only from the request that applies the fix', async () => {
	const { original, act } = await fixture();
	const publish = vi
		.spyOn(workflowService, 'activateWorkflow')
		.mockResolvedValue(new WorkflowEntity());
	const results = await Promise.allSettled([
		act('approve-and-publish'),
		act('approve-and-publish'),
	]);
	const saved = await workflows.findOneByOrFail({ id: original.id });
	expect(results.some(({ status }) => status === 'fulfilled')).toBe(true);
	for (const result of results) {
		if (result.status === 'rejected') expect(result.reason).toBeInstanceOf(ConflictError);
		else expect(result.value.appliedVersion?.versionId).toBe(saved.versionId);
	}
	expect(publish).toHaveBeenCalledTimes(1);
});

it('returns the applied fix when the editor notification fails after publication', async () => {
	const { original, act } = await fixture();
	const publish = vi.spyOn(workflowService, 'activateWorkflow');
	vi.spyOn(Container.get(CollaborationService), 'broadcastWorkflowUpdate').mockRejectedValueOnce(
		new Error('Editor notification unavailable.'),
	);

	const detail = await act('approve-and-publish');
	expect(detail).toMatchObject({
		closedReason: 'applied',
	});
	expect(detail.publishError).toBeUndefined();
	expect(
		await Container.get(WorkflowPublicationOutboxRepository).findInFlightByWorkflowId(original.id),
	).toMatchObject({ publishedVersionId: detail.appliedVersion?.versionId });
	expect(publish).toHaveBeenCalledTimes(1);
});

it('reverts and reapplies the review schema before suggestions are created', async () => {
	const db = Container.get(DataSource);
	[...postgresMigrations, ...sqliteMigrations].forEach(wrapMigration);
	const migration = db.migrations.find(
		({ constructor }) => constructor.name === 'AddWorkflowSuggestionReviewState1790950059734',
	);
	if (!migration) throw new Error('The workflow suggestion review migration is not registered.');
	const runner = db.createQueryRunner();
	try {
		await migration.down(runner);
		try {
			expect(await runner.hasColumn(suggestions.metadata.tablePath, 'resultKind')).toBe(false);
		} finally {
			await migration.up(runner);
		}
	} finally {
		await runner.release();
	}

	const { suggestion } = await fixture();
	expect(await suggestions.findOneByOrFail({ id: suggestion.id })).toMatchObject({
		resultKind: 'fix_ready',
		appliedVersion: null,
	});
	await expect(
		suggestions.update(suggestion.id, { resultKind: 'invalid' as never }),
	).rejects.toThrow();
	await expect(suggestions.update(suggestion.id, { resultKind: null as never })).rejects.toThrow();
});

it('keeps human activity when its actor is deleted', async () => {
	const { suggestion } = await fixture();
	const actor = await createUser();
	const activity = Container.get(DataSource).getRepository(WorkflowSuggestionActivity);
	await activity.save(
		activity.create({
			suggestionId: suggestion.id,
			action: 'discarded',
			author: 'human',
			actorId: actor.id,
		}),
	);

	await Container.get(UserRepository).delete(actor.id);

	expect(
		await activity.findOneByOrFail({ suggestionId: suggestion.id, action: 'discarded' }),
	).toMatchObject({
		author: 'human',
		actorId: null,
	});
	expect(await suggestions.findOneBy({ id: suggestion.id })).not.toBeNull();
});
