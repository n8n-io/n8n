import {
	createTeamProject,
	createWorkflowWithHistory,
	linkUserToProject,
	mockInstance,
	shareWorkflowWithUsers,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import {
	ExecutionRepository,
	GLOBAL_MEMBER_ROLE,
	GLOBAL_OWNER_ROLE,
	ProjectRepository,
	SharedWorkflowRepository,
	TransactionRunner,
	UserRepository,
	WorkflowHistoryRepository,
	WorkflowPublicationTriggerStatusRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { AuthHandlerRegistry } from '@/auth/auth-handler.registry';
import { CollaborationService } from '@/collaboration/collaboration.service';
import { ControllerRegistry } from '@/controller.registry';
import { WorkflowPublicationNotifier } from '@/workflows/publication/workflow-publication-notifier';
import { WorkflowPublishGuardProxy } from '@/workflows/workflow-publish-guard-proxy.service';
import { WorkflowValidationService } from '@/workflows/workflow-validation.service';
import { WorkflowService } from '@/workflows/workflow.service';
import { createExecution } from '@test-integration/db/executions';
import { createCustomRoleWithScopeSlugs } from '@test-integration/db/roles';
import { createUser } from '@test-integration/db/users';
import { initNodeTypes, setupTestServer } from '@test-integration/utils';

import { WorkflowSuggestionActivity } from '../../workflow-suggestions/database/workflow-suggestion-activity.entity';
import { WorkflowSuggestionRepository } from '../../workflow-suggestions/database/workflow-suggestion.repository';
import { WorkflowSuggestionActionsService } from '../../workflow-suggestions/workflow-suggestion-actions.service';
import { WorkflowSuggestionService } from '../../workflow-suggestions/workflow-suggestion.service';
import { SelfHealingResultRepository } from '../database/self-healing-result.repository';
import { SelfHealingResultService } from '../self-healing-result.service';

mockInstance(ActiveWorkflowManager);
mockInstance(WorkflowPublicationNotifier);
const validation = mockInstance(WorkflowValidationService);

const testServer = setupTestServer({
	modules: ['instance-ai'],
	endpointGroups: [],
	setupTimeout: 30_000,
});

let service: SelfHealingResultService;
let results: SelfHealingResultRepository;
let suggestions: WorkflowSuggestionRepository;
let suggestionService: WorkflowSuggestionService;
let actions: WorkflowSuggestionActionsService;
let workflows: WorkflowRepository;

beforeAll(async () => {
	await initNodeTypes();
	await import('../self-healing-results.controller.js');
	Container.get(ControllerRegistry).activate(testServer.app);
	await Container.get(AuthHandlerRegistry).init();
	service = Container.get(SelfHealingResultService);
	results = Container.get(SelfHealingResultRepository);
	suggestions = Container.get(WorkflowSuggestionRepository);
	suggestionService = Container.get(WorkflowSuggestionService);
	actions = Container.get(WorkflowSuggestionActionsService);
	workflows = Container.get(WorkflowRepository);
});

beforeEach(() => {
	Container.get(GlobalConfig).workflows.useWorkflowPublicationService = true;
	validation.validateTriggerNodeIds.mockReturnValue({ isValid: true });
	validation.validateForActivation.mockResolvedValue({ isValid: true });
	validation.validateDynamicCredentials.mockResolvedValue({ isValid: true });
	validation.validatePublisherCredentialAccess.mockResolvedValue({ isValid: true });
	validation.validateSubWorkflowReferences.mockResolvedValue({ isValid: true });
	validation.validateCredentialNodeRestrictions.mockReturnValue({ isValid: true });
});

afterEach(async () => {
	vi.restoreAllMocks();
	await results.createQueryBuilder().delete().execute();
	await Container.get(DataSource).getRepository(WorkflowSuggestionActivity).clear();
	await suggestions.createQueryBuilder().delete().execute();
});

type Outcome = 'fix_ready' | 'needs_you' | 'could_not_fix';

async function prepareFixture(outcome: Outcome = 'needs_you', withSuggestion = false) {
	const user = await createUser();
	const workflow = await createWorkflowWithHistory({}, user);
	const project = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(user.id);
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
	const execution = await createExecution({ status: 'error' }, original);
	const graph = {
		nodes: original.nodes.map((node) => ({ ...node, position: [100, 100] as [number, number] })),
		connections: original.connections,
	};
	const suggestion = withSuggestion
		? await suggestionService.prepareSuggestion(
				await suggestionService.captureBaseline(workflow.id, user.id),
				{
					graph,
					explanation: 'Update the workflow graph.',
					resultKind: outcome === 'fix_ready' ? 'fix_ready' : 'needs_you',
				},
			)
		: undefined;
	const input = {
		workflowId: workflow.id,
		projectId: project.id,
		backgroundUserId: user.id,
		executionId: execution.id,
		usage: { credits: 1, turns: 2, durationSeconds: 30 },
		outcome,
		summary: 'Review the execution result.',
		report: 'The saved report explains the investigation and the next step.',
		...(suggestion ? { suggestion } : {}),
	};
	return { user, project, original, graph, input };
}

async function fixture(outcome: Outcome = 'needs_you', withSuggestion = false) {
	const prepared = await prepareFixture(outcome, withSuggestion);
	const result = await service.create(await service.prepare(prepared.input));
	const { user, project, original } = prepared;
	const url = `/projects/${project.id}/workflows/${original.id}/self-healing-results/${result.id}`;
	const getDetail = async () => await service.getDetail(user, project.id, original.id, result.id);
	return { ...prepared, result, url, getDetail };
}

it.each([
	['fix_ready', true],
	['needs_you', true],
	['needs_you', false],
	['could_not_fix', false],
] as const)('reads a saved %s result with suggestion=%s', async (outcome, withSuggestion) => {
	const { user, result, input, url, original, graph } = await fixture(outcome, withSuggestion);
	const response = await testServer.authAgentFor(user).get(url);
	expect(response.status).toBe(200);
	expect(response.body.data).toMatchObject({
		resultId: result.id,
		outcome,
		report: input.report,
		reviewState: 'open',
		usage: input.usage,
		execution: { status: 'available', id: input.executionId },
	});
	if (withSuggestion) {
		expect(response.body.data.suggestion).toMatchObject({
			resultKind: outcome,
			payload: { original: { nodes: original.nodes }, candidate: graph },
			activity: [expect.objectContaining({ action: 'submitted' })],
		});
	} else {
		expect(response.body.data.suggestion).toBeNull();
	}
	expect(await workflows.findOneByOrFail({ id: original.id })).toEqual(original);
});

it.each([undefined, null])('rejects an absent execution ID (%s)', async (executionId) => {
	const { input } = await prepareFixture();
	await expect(
		service.prepare({ ...input, executionId } as unknown as typeof input),
	).rejects.toThrow();
	expect(await results.count()).toBe(0);
});

it.each([
	['fix_ready', false],
	['could_not_fix', true],
] as const)('rejects %s with suggestion=%s without partial records', async (outcome, attached) => {
	const { input } = await prepareFixture(outcome, attached);
	await expect(service.prepare(input)).rejects.toThrow();
	expect(await results.count()).toBe(0);
	expect(await suggestions.count()).toBe(0);
});

it('rejects prepared suggestion identities that do not match the result', async () => {
	const first = await prepareFixture('fix_ready', true);
	const second = await prepareFixture('fix_ready', true);
	await expect(
		service.prepare({ ...first.input, suggestion: second.input.suggestion }),
	).rejects.toThrow();
	expect(await results.count()).toBe(0);
	expect(await suggestions.count()).toBe(0);
});

it('rejects a suggestion outcome that differs from the result', async () => {
	const { input } = await prepareFixture('fix_ready', true);
	input.suggestion!.resultKind = 'needs_you';
	await expect(service.prepare(input)).rejects.toThrow();
	expect(await results.count()).toBe(0);
	expect(await suggestions.count()).toBe(0);
});

it('does not require a published workflow for an informational result', async () => {
	const user = await createUser();
	const workflow = await createWorkflowWithHistory({}, user);
	const project = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(user.id);
	const execution = await createExecution({ status: 'error' }, workflow);
	const prepared = await service.prepare({
		workflowId: workflow.id,
		projectId: project.id,
		backgroundUserId: user.id,
		executionId: execution.id,
		usage: { credits: 1, turns: 2, durationSeconds: 30 },
		outcome: 'could_not_fix',
		summary: 'The investigation could not produce a fix.',
		report: 'The workflow needs human input.',
	});
	const result = await service.create(prepared);
	expect(await service.getDetail(user, project.id, workflow.id, result.id)).toMatchObject({
		outcome: 'could_not_fix',
		suggestion: null,
		reviewState: 'open',
	});
});

it('rechecks the background user when prepared content is committed', async () => {
	const { input, user } = await prepareFixture('fix_ready', true);
	const prepared = await service.prepare(input);
	await Container.get(UserRepository).update(user.id, { disabled: true });
	await expect(service.create(prepared)).rejects.toThrow('edit access');
	expect(await results.count()).toBe(0);
	expect(await suggestions.count()).toBe(0);
});

it('preserves report text and measured usage', async () => {
	const { input, user, project, original } = await prepareFixture();
	const report = 'Configure the password parameter before retrying: password=example-value.';
	const prepared = await service.prepare({
		...input,
		report,
		usage: { credits: 0, turns: 1, durationSeconds: null },
	});
	const result = await service.create(prepared);
	const detail = await service.getDetail(user, project.id, original.id, result.id);
	expect(detail.report).toBe(report);
	expect(detail.usage).toEqual({ credits: 0, turns: 1, durationSeconds: null });
});

it('rolls back the result, suggestion, and activity with the caller transaction', async () => {
	const { input, original } = await prepareFixture('fix_ready', true);
	const execution = await createExecution({ status: 'error' }, original);
	const prepared = await service.prepare({ ...input, executionId: execution.id });
	await expect(
		Container.get(TransactionRunner).run({}, async (ctx) => {
			await service.create(prepared, ctx);
			throw new Error('Completion failed.');
		}),
	).rejects.toThrow('Completion failed.');
	expect(await results.count()).toBe(0);
	expect(await suggestions.count()).toBe(0);
	expect(await Container.get(DataSource).getRepository(WorkflowSuggestionActivity).count()).toBe(0);
});

it('rolls back suggestion storage when result insertion fails', async () => {
	const { input } = await prepareFixture('fix_ready', true);
	const prepared = await service.prepare(input);
	vi.spyOn(results, 'createResult').mockRejectedValueOnce(new Error('Result unavailable.'));
	await expect(service.create(prepared)).rejects.toThrow('Result unavailable.');
	expect(await suggestions.count()).toBe(0);
	expect(await Container.get(DataSource).getRepository(WorkflowSuggestionActivity).count()).toBe(0);
});

it('keeps the report and unknown usage after the execution is removed', async () => {
	const { user, project, original, input } = await prepareFixture();
	const execution = await createExecution({ status: 'error' }, original);
	const prepared = await service.prepare({
		...input,
		executionId: execution.id,
		usage: { credits: null, turns: 2, durationSeconds: null },
	});
	const result = await service.create(prepared);
	await Container.get(ExecutionRepository).delete(execution.id);
	expect((await results.findOneByOrFail({ id: result.id })).executionId).toBe(execution.id);
	const detail = await service.getDetail(user, project.id, original.id, result.id);
	expect(detail).toMatchObject({
		report: input.report,
		execution: { status: 'unavailable' },
		usage: { credits: null, turns: 2, durationSeconds: null },
	});
});

it('dismisses an informational result for every editor without changing its workflow', async () => {
	const { user, project, original, result, url } = await fixture();
	const editor = await createUser();
	await shareWorkflowWithUsers(original, [editor]);
	const response = await testServer.authAgentFor(user).post(`${url}/dismiss`);
	expect(response.status).toBe(200);
	expect(response.body.data.reviewState).toBe('dismissed');
	const firstDismissal = await results.findOneByOrFail({ id: result.id });
	await service.dismiss(editor, project.id, original.id, result.id);
	expect(await results.findOneByOrFail({ id: result.id })).toEqual(firstDismissal);
	expect((await service.getDetail(editor, project.id, original.id, result.id)).reviewState).toBe(
		'dismissed',
	);
	expect(await workflows.findOneByOrFail({ id: original.id })).toEqual(original);
});

it('rolls back shared dismissal when result storage fails', async () => {
	const { user, project, original, result } = await fixture('needs_you', true);
	const suggestionId = result.suggestionId!;
	const beforeActivity = await suggestions.getActivity(suggestionId);
	vi.spyOn(results, 'dismissResult').mockRejectedValueOnce(new Error('Dismissal unavailable.'));
	await expect(service.dismiss(user, project.id, original.id, result.id)).rejects.toThrow(
		'Dismissal unavailable.',
	);
	expect(await results.findOneByOrFail({ id: result.id })).toMatchObject({ dismissedAt: null });
	expect(await suggestions.findOneByOrFail({ id: suggestionId })).toMatchObject({
		state: 'pending',
	});
	expect(await suggestions.getActivity(suggestionId)).toEqual(beforeActivity);
});

it('dismisses the result and its pending suggestion together', async () => {
	const { user, project, original, result, getDetail } = await fixture('needs_you', true);
	await service.dismiss(user, project.id, original.id, result.id);
	expect(await getDetail()).toMatchObject({
		reviewState: 'dismissed',
		dismissedById: user.id,
		suggestion: { state: 'closed', closedReason: 'discarded' },
	});
	expect((await suggestions.getActivity(result.suggestionId!)).map(({ action }) => action)).toEqual(
		['submitted', 'discarded'],
	);
	expect(await workflows.findOneByOrFail({ id: original.id })).toEqual(original);
});

it.each(['before', 'after'] as const)(
	'returns shared dismissal when it commits %s the proposal read',
	async (timing) => {
		const { user, project, original, result, getDetail } = await fixture('needs_you', true);
		const getProposal = suggestionService.getProposal.bind(suggestionService);
		const dismiss = async () => await service.dismiss(user, project.id, original.id, result.id);
		vi.spyOn(suggestionService, 'getProposal').mockImplementationOnce(async (...args) => {
			if (timing === 'before') await dismiss();
			const proposal = await getProposal(...args);
			if (timing === 'after') await dismiss();
			return proposal;
		});

		const detail = await getDetail();
		const saved = await results.findOneByOrFail({ id: result.id });
		expect(saved.dismissedAt).not.toBeNull();
		expect(detail).toMatchObject({
			reviewState: 'dismissed',
			dismissedAt: saved.dismissedAt!.toISOString(),
			dismissedById: user.id,
			suggestion: { state: 'closed', closedReason: 'discarded' },
		});
	},
);

it('keeps the winner when informational dismissal races another discard', async () => {
	const { user, project, original, result, getDetail } = await fixture('needs_you', true);
	const [, discardOutcome] = await Promise.all([
		service.dismiss(user, project.id, original.id, result.id),
		actions.discardPending(user, project.id, original.id, result.suggestionId!),
	]);
	const directlyDiscarded = discardOutcome === 'discarded';
	const detail = await getDetail();
	expect(detail.reviewState).toBe(directlyDiscarded ? 'discarded' : 'dismissed');
	expect(detail.dismissedAt === null).toBe(directlyDiscarded);
	expect((await suggestions.getActivity(result.suggestionId!)).map(({ action }) => action)).toEqual(
		['submitted', 'discarded'],
	);
	expect(await workflows.findOneByOrFail({ id: original.id })).toEqual(original);
});

it.each(['discarded', 'outdated'] as const)(
	'keeps a prior %s disposition when informational dismissal is requested',
	async (reason) => {
		const { user, project, original, result, getDetail } = await fixture('needs_you', true);
		if (reason === 'discarded') {
			await actions.discard(user, project.id, original.id, result.suggestionId!);
		} else {
			await workflows.update(original.id, { settings: { executionTimeout: 60 } });
		}
		const response = await service.dismiss(user, project.id, original.id, result.id);
		expect(response.reviewState).toBe(reason);
		expect(await getDetail()).toMatchObject({ reviewState: reason, dismissedAt: null });
	},
);

it('preserves outdated reconciliation when shared dismissal rejects a moved workflow', async () => {
	const { user, project, original, result } = await fixture('needs_you', true);
	const destination = await createTeamProject(undefined, user);
	await Container.get(SharedWorkflowRepository).update(
		{ workflowId: original.id, projectId: project.id },
		{ projectId: destination.id },
	);
	await expect(service.dismiss(user, project.id, original.id, result.id)).rejects.toThrow();
	expect(await results.findOneByOrFail({ id: result.id })).toMatchObject({ dismissedAt: null });
	expect(await suggestions.findOneByOrFail({ id: result.suggestionId! })).toMatchObject({
		state: 'closed',
		closedReason: 'outdated',
	});
	expect((await suggestions.getActivity(result.suggestionId!)).map(({ action }) => action)).toEqual(
		['submitted', 'outdated'],
	);
});

it('reflects internal suggestion actions without a separate result update', async () => {
	const { user, project, original, result, getDetail } = await fixture('fix_ready', true);
	await actions.apply(user, project.id, original.id, result.suggestionId!);
	expect(await getDetail()).toMatchObject({
		reviewState: 'applied',
		dismissedAt: null,
		suggestion: { appliedVersion: { action: 'apply' } },
	});
});

it.each(['apply', 'approve-and-publish'] as const)(
	'applies through %s and forwards the editor client identity',
	async (action) => {
		const { user, result, original, url } = await fixture('fix_ready', true);
		const locks = vi.spyOn(Container.get(CollaborationService), 'validateWriteLock');
		const publish = vi.spyOn(Container.get(WorkflowService), 'activateWorkflow');
		const agent = testServer.authAgentFor(user);
		const response = await agent.post(`${url}/${action}`).set('push-ref', 'review-editor');
		expect(response.status).toBe(200);
		expect(response.body.data).toMatchObject({
			resultId: result.id,
			reviewState: 'applied',
			suggestion: { appliedVersion: { action } },
		});
		expect(locks).toHaveBeenCalledWith(user.id, 'review-editor', original.id, 'update');
		const saved = await workflows.findOneByOrFail({ id: original.id });
		const historyCount = await Container.get(WorkflowHistoryRepository).countBy({
			workflowId: original.id,
		});
		await agent.post(`${url}/${action}`).set('push-ref', 'review-editor').expect(200);
		expect(await workflows.findOneByOrFail({ id: original.id })).toEqual(saved);
		expect(
			await Container.get(WorkflowHistoryRepository).countBy({ workflowId: original.id }),
		).toBe(historyCount);
		expect(publish).toHaveBeenCalledTimes(action === 'approve-and-publish' ? 1 : 0);
	},
);

it('returns Applied and a request error when publication fails', async () => {
	const { user, url, getDetail } = await fixture('fix_ready', true);
	vi.spyOn(Container.get(WorkflowPublishGuardProxy), 'assertCanPublish').mockRejectedValueOnce(
		new Error('An open review blocks publication.'),
	);
	const response = await testServer.authAgentFor(user).post(`${url}/approve-and-publish`);
	expect(response.status).toBe(200);
	expect(response.body.data).toMatchObject({
		reviewState: 'applied',
		publishError: 'An open review blocks publication.',
	});
	expect(await getDetail()).toMatchObject({ reviewState: 'applied' });
	expect(await getDetail()).not.toHaveProperty('publishError');
});

it('discards Fix ready through the result route without saving the graph', async () => {
	const { user, original, url } = await fixture('fix_ready', true);
	const response = await testServer.authAgentFor(user).post(`${url}/discard`);
	expect(response.status).toBe(200);
	expect(response.body.data).toMatchObject({ reviewState: 'discarded', dismissedAt: null });
	expect(await workflows.findOneByOrFail({ id: original.id })).toEqual(original);
});

it('does not report Apply when reconciliation finds an outdated proposal', async () => {
	const { user, original, url } = await fixture('fix_ready', true);
	await workflows.update(original.id, { settings: { executionTimeout: 60 } });
	const response = await testServer.authAgentFor(user).post(`${url}/apply`);
	expect(response.status).toBe(200);
	expect(response.body.data).toMatchObject({
		reviewState: 'outdated',
		suggestion: { appliedVersion: null },
	});
});

it.each(['apply', 'approve-and-publish', 'discard'] as const)(
	'rejects %s for Needs attention',
	async (action) => {
		const { user, original, url } = await fixture('needs_you', true);
		const response = await testServer.authAgentFor(user).post(`${url}/${action}`);
		expect(response.status).toBe(409);
		expect(await workflows.findOneByOrFail({ id: original.id })).toEqual(original);
	},
);

it('allows shared editors to review without membership in the owning project', async () => {
	testServer.license.enable('feat:sharing');
	const { original, project, result, url } = await fixture();
	const editor = await createUser();
	await shareWorkflowWithUsers(original, [editor]);
	const agent = testServer.authAgentFor(editor);
	await agent.get(url).expect(200);
	await agent.post(`${url}/dismiss`).expect(200);
	const editorProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
		editor.id,
	);
	await Container.get(SharedWorkflowRepository).delete({
		workflowId: original.id,
		projectId: editorProject.id,
	});
	await agent.get(url).expect(403);
	await expect(service.getDetail(editor, project.id, original.id, result.id)).rejects.toThrow();
});

it('keeps detail and non-publish actions available without publish scope', async () => {
	testServer.license.enable('feat:advancedPermissions');
	const { user, original, result } = await fixture('fix_ready', true);
	const editor = await createUser();
	const project = await createTeamProject(undefined, user);
	const role = await createCustomRoleWithScopeSlugs(['workflow:read', 'workflow:update']);
	await linkUserToProject(editor, project, role.slug);
	await Container.get(SharedWorkflowRepository).save({
		workflowId: original.id,
		projectId: project.id,
		role: 'workflow:editor',
	});
	const ownerProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
		user.id,
	);
	const url = `/projects/${ownerProject.id}/workflows/${original.id}/self-healing-results/${result.id}`;
	const agent = testServer.authAgentFor(editor);
	await agent.get(url).expect(200);
	await agent.post(`${url}/approve-and-publish`).expect(403);
	await agent.post(`${url}/apply`).expect(200);
});

it('keeps the report readable when a reviewer loses execution read access', async () => {
	testServer.license.enable('feat:advancedPermissions');
	const { user, project: ownerProject, original, input } = await prepareFixture();
	const execution = await createExecution({ status: 'error' }, original);
	const result = await service.create(
		await service.prepare({ ...input, executionId: execution.id }),
	);
	const editor = await createUser();
	const project = await createTeamProject(undefined, user);
	const readerRole = await createCustomRoleWithScopeSlugs([
		'workflow:read',
		'workflow:update',
		'execution:read',
	]);
	const editorRole = await createCustomRoleWithScopeSlugs(['workflow:read', 'workflow:update']);
	await linkUserToProject(editor, project, readerRole.slug);
	await Container.get(SharedWorkflowRepository).save({
		workflowId: original.id,
		projectId: project.id,
		role: 'workflow:editor',
	});
	const url = `/projects/${ownerProject.id}/workflows/${original.id}/self-healing-results/${result.id}`;
	const agent = testServer.authAgentFor(editor);
	const initial = await agent.get(url).expect(200);
	expect(initial.body.data.execution).toEqual({ status: 'available', id: execution.id });

	await linkUserToProject(editor, project, editorRole.slug);
	const detail = await agent.get(url).expect(200);
	expect(detail.body.data).toMatchObject({
		report: input.report,
		execution: { status: 'unavailable' },
	});
	expect(detail.body.data.execution).not.toHaveProperty('id');
});

it('checks execution access against the stored role when the supplied user is stale', async () => {
	const { user, project: ownerProject, original, input } = await prepareFixture();
	const execution = await createExecution({ status: 'error' }, original);
	const result = await service.create(
		await service.prepare({ ...input, executionId: execution.id }),
	);
	const reviewer = await createUser({ role: GLOBAL_OWNER_ROLE });
	const project = await createTeamProject(undefined, user);
	const role = await createCustomRoleWithScopeSlugs(['workflow:read', 'workflow:update']);
	await linkUserToProject(reviewer, project, role.slug);
	await Container.get(SharedWorkflowRepository).save({
		workflowId: original.id,
		projectId: project.id,
		role: 'workflow:editor',
	});
	const initial = await service.getDetail(reviewer, ownerProject.id, original.id, result.id);
	expect(initial.execution).toEqual({ status: 'available', id: execution.id });

	await Container.get(UserRepository).update(reviewer.id, { role: GLOBAL_MEMBER_ROLE });
	expect(reviewer.role.slug).toBe(GLOBAL_OWNER_ROLE.slug);
	const detail = await service.getDetail(reviewer, ownerProject.id, original.id, result.id);
	expect(detail).toMatchObject({ report: input.report, execution: { status: 'unavailable' } });
	expect(detail.execution).not.toHaveProperty('id');
});

it('checks enabled-user status again after a result has been created', async () => {
	const { user, project, original, result } = await fixture();
	await Container.get(UserRepository).update(user.id, { disabled: true });
	await expect(service.getDetail(user, project.id, original.id, result.id)).rejects.toThrow();
	await expect(service.dismiss(user, project.id, original.id, result.id)).rejects.toThrow();
	expect(await results.findOneByOrFail({ id: result.id })).toMatchObject({ dismissedAt: null });
});

it('rejects a result ID supplied under another workflow', async () => {
	const { user, project, result } = await fixture();
	const other = await createWorkflowWithHistory({}, user);
	const url = `/projects/${project.id}/workflows/${other.id}/self-healing-results/${result.id}`;
	await testServer.authAgentFor(user).get(url).expect(404);
	await testServer.authAgentFor(user).post(`${url}/dismiss`).expect(404);
});

it('returns report details without changing the result or workflow', async () => {
	const { user, original, result, input, url } = await fixture('could_not_fix');
	const response = await testServer.authAgentFor(user).get(url);
	expect(response.status).toBe(200);
	expect(response.body.data).toMatchObject({
		report: input.report,
		execution: { status: 'available', id: input.executionId },
	});
	expect(await results.findOneByOrFail({ id: result.id })).toEqual(result);
	expect(await workflows.findOneByOrFail({ id: original.id })).toEqual(original);
});
