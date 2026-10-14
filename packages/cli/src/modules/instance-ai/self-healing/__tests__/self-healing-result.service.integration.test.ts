import type { SelfHealingResultUsage } from '@n8n/api-types';
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
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { randomUUID } from 'node:crypto';

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

import { InstanceAiService } from '../../instance-ai.service';
import { WorkflowSuggestionActivity } from '../../workflow-suggestions/database/workflow-suggestion-activity.entity';
import { WorkflowSuggestionRepository } from '../../workflow-suggestions/database/workflow-suggestion.repository';
import { WorkflowSuggestionActionsService } from '../../workflow-suggestions/workflow-suggestion-actions.service';
import { WorkflowSuggestionService } from '../../workflow-suggestions/workflow-suggestion.service';
import { SelfHealingResultRepository } from '../database/self-healing-result.repository';
import { SelfHealingInvestigationRepository } from '../database/self-healing-investigation.repository';
import type { SelfHealingRunResult } from '../self-healing-agent.service';
import { SelfHealingExecutionReferenceService } from '../self-healing-execution-reference.service';
import { SelfHealingInvestigationService } from '../self-healing-investigation.service';
import { SelfHealingResultService } from '../self-healing-result.service';

mockInstance(ActiveWorkflowManager);
mockInstance(WorkflowPublicationNotifier);
const validation = mockInstance(WorkflowValidationService);
const runtime = mockInstance(InstanceAiService);

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
let investigations: SelfHealingInvestigationRepository;

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
	investigations = Container.get(SelfHealingInvestigationRepository);
});

beforeEach(() => {
	Container.get(GlobalConfig).workflows.useWorkflowPublicationService = true;
	Container.get(GlobalConfig).instanceAi.selfHealingEnabled = true;
	runtime.startSelfHealingRun.mockReset();
	validation.validateTriggerNodeIds.mockReturnValue({ isValid: true });
	validation.validateForActivation.mockResolvedValue({ isValid: true });
	validation.validateDynamicCredentials.mockResolvedValue({ isValid: true });
	validation.validatePublisherCredentialAccess.mockResolvedValue({ isValid: true });
	validation.validateSubWorkflowReferences.mockResolvedValue({ isValid: true });
	validation.validateCredentialNodeRestrictions.mockReturnValue({ isValid: true });
});

afterEach(async () => {
	vi.restoreAllMocks();
	await investigations.createQueryBuilder().delete().execute();
	await results.createQueryBuilder().delete().execute();
	await Container.get(DataSource).getRepository(WorkflowSuggestionActivity).clear();
	await suggestions.createQueryBuilder().delete().execute();
});

type Outcome = 'fix_ready' | 'needs_you' | 'could_not_fix';

async function prepareFixture(outcome: Outcome = 'needs_you') {
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
	const execution = await createExecution(
		{ status: 'error', mode: 'trigger', workflowVersionId: original.versionId },
		original,
	);
	const graph = {
		nodes: original.nodes.map((node) => ({ ...node, position: [100, 100] as [number, number] })),
		connections: original.connections,
	};
	const input = {
		workflowId: workflow.id,
		projectId: project.id,
		backgroundUserId: user.id,
		executionId: execution.id,
		usage: {
			credits: 1,
			turns: 2,
			durationSeconds: 30,
		},
		outcome,
		summary: 'Review the execution result.',
		report: 'The saved report explains the investigation and the next step.',
	};
	return { user, project, original, graph, input };
}

async function fixture(outcome: Outcome = 'needs_you', withSuggestion = false) {
	const prepared = await prepareInvestigation(outcome, withSuggestion);
	const result = await service.complete({ investigationId: prepared.investigation.id });
	const { user, project, original } = prepared;
	const url = `/projects/${project.id}/workflows/${original.id}/self-healing-results/${result.id}`;
	const getDetail = async () => await service.getDetail(user, project.id, original.id, result.id);
	return { ...prepared, result, url, getDetail };
}

async function prepareInvestigation(
	outcome: Outcome = 'fix_ready',
	withSuggestion = true,
	content: { report?: string; usage?: SelfHealingResultUsage } = {},
) {
	const fixture = await prepareFixture(outcome);
	const { original, user, graph } = fixture;
	const input = { ...fixture.input, ...content };
	const baseline = await suggestionService.captureBaseline(original.id, user.id);
	const investigation = await Container.get(TransactionRunner).run({}, async (ctx) => {
		return await investigations.createInvestigation(
			{ baseline, executionId: input.executionId, threadId: randomUUID(), runId: randomUUID() },
			ctx,
		);
	});
	await investigations.storeAcceptedOutput(investigation.id, {
		output: {
			outcome,
			summary: input.summary,
			report: input.report,
			...(withSuggestion ? { candidateFilePath: 'candidate.workflow.ts' } : {}),
		},
		usage: input.usage,
		completedAt: new Date().toISOString(),
		...(withSuggestion ? { candidate: { graph } } : {}),
	});
	return { ...fixture, input, investigation };
}

it.each(['same', 'different'] as const)(
	'returns one investigation to concurrent starts for %s failures',
	async (failure) => {
		const { input, original } = await prepareFixture();
		const executionId =
			failure === 'same'
				? input.executionId
				: (
						await createExecution(
							{ status: 'error', mode: 'trigger', workflowVersionId: original.versionId },
							original,
						)
					).id;
		const producer = Container.get(SelfHealingInvestigationService);
		const validationReady = createDeferredPromise();
		const stopRun = createDeferredPromise();
		const runFinished = createDeferredPromise();
		const references = Container.get(SelfHealingExecutionReferenceService);
		const validateFailure = references.validateFailure.bind(references);
		let validated = 0;
		vi.spyOn(references, 'validateFailure').mockImplementation(async (...args) => {
			await validateFailure(...args);
			validated += 1;
			if (validated === 2) validationReady.resolve();
			// Both callers must pass the initial lookup before either can claim the workflow.
			await validationReady.promise;
		});
		runtime.startSelfHealingRun.mockImplementation(async (_input, lifecycle) => {
			await stopRun.promise;
			const result: SelfHealingRunResult = {
				threadId: lifecycle.threadId,
				runId: lifecycle.runId,
				status: 'cancelled',
				usage: { credits: null, turns: null, durationSeconds: null },
			};
			try {
				await lifecycle.onComplete(result, new AbortController().signal);
				return result;
			} finally {
				runFinished.resolve();
			}
		});
		try {
			const [first, second] = await Promise.all([
				producer.start(input),
				producer.start({ ...input, executionId }),
			]);
			expect(first).toEqual(second);
			expect(first.kind).toBe('investigation');
			expect(await investigations.count()).toBe(1);
			await vi.waitFor(() => expect(runtime.startSelfHealingRun).toHaveBeenCalledTimes(1));
			expect(await results.count()).toBe(0);
			expect(await suggestions.count()).toBe(0);
		} finally {
			stopRun.resolve();
			if (runtime.startSelfHealingRun.mock.calls.length > 0) await runFinished.promise;
		}
	},
);

it('returns committed completion without repeating access or execution checks', async () => {
	const { investigation, user } = await prepareInvestigation();
	const result = await service.complete({ investigationId: investigation.id });
	await Container.get(UserRepository).update(user.id, { disabled: true });
	await Container.get(ExecutionRepository).delete(investigation.executionId);
	expect(await service.complete({ investigationId: investigation.id })).toMatchObject({
		id: result.id,
	});
	expect(await results.count()).toBe(1);
	expect(await suggestions.count()).toBe(1);
});

it('commits concurrent finalization only once', async () => {
	const { investigation } = await prepareInvestigation();
	const completed = await Promise.all([
		service.complete({ investigationId: investigation.id }),
		service.complete({ investigationId: investigation.id }),
	]);
	expect(completed[0].id).toBe(completed[1].id);
	expect(await results.count()).toBe(1);
	expect(await suggestions.count()).toBe(1);
	expect(await Container.get(DataSource).getRepository(WorkflowSuggestionActivity).count()).toBe(1);
});

it('rolls back all completion writes and retries from accepted data', async () => {
	const { investigation } = await prepareInvestigation();
	const completeWithResult = investigations.completeWithResult.bind(investigations);
	vi.spyOn(investigations, 'completeWithResult').mockImplementationOnce(async (...args) => {
		await completeWithResult(...args);
		throw new Error('Completion unavailable.');
	});
	await expect(service.complete({ investigationId: investigation.id })).rejects.toThrow(
		'Completion unavailable.',
	);
	expect(await results.count()).toBe(0);
	expect(await suggestions.count()).toBe(0);
	expect(await Container.get(DataSource).getRepository(WorkflowSuggestionActivity).count()).toBe(0);
	expect(await investigations.get(investigation.id)).toMatchObject({
		resultId: null,
		finishedAt: null,
		acceptedOutput: expect.any(Object),
	});
	const result = await service.complete({ investigationId: investigation.id });
	expect(await investigations.get(investigation.id)).toMatchObject({
		resultId: result.id,
		acceptedOutput: null,
	});
});

it('rejects a changed baseline when finalizing an accepted report', async () => {
	const { investigation, original } = await prepareInvestigation('needs_you', false);
	await workflows.update(original.id, { name: 'Changed after acceptance' });
	await expect(service.complete({ investigationId: investigation.id })).rejects.toThrow('baseline');
	expect(await results.count()).toBe(0);
	expect((await investigations.get(investigation.id)).finishedAt).toBeNull();
});

it('keeps the first accepted output and protects it from technical cleanup', async () => {
	const { investigation } = await prepareInvestigation('could_not_fix', false);
	const first = await investigations.get(investigation.id);
	await investigations.storeAcceptedOutput(investigation.id, {
		output: { outcome: 'could_not_fix', summary: 'Changed', report: 'Changed' },
		usage: { credits: null, turns: null, durationSeconds: null },
		completedAt: new Date().toISOString(),
	});
	await investigations.finishWithoutResult(investigation.id);
	expect(await investigations.get(investigation.id)).toMatchObject({
		acceptedOutput: first.acceptedOutput,
		finishedAt: null,
	});
	await investigations.rejectAcceptedOutput(investigation.id);
	await expect(service.complete({ investigationId: investigation.id })).rejects.toThrow(
		'no accepted output',
	);
	expect(await results.count()).toBe(0);
});

it.each([
	['fix_ready', true],
	['needs_you', true],
	['needs_you', false],
	['could_not_fix', false],
] as const)(
	'completes and reads a %s result with suggestion=%s',
	async (outcome, withSuggestion) => {
		const { user, result, input, url, original, graph, investigation } = await fixture(
			outcome,
			withSuggestion,
		);
		expect(result.executionId).toBe(investigation.executionId);
		expect(Boolean(result.suggestionId)).toBe(withSuggestion);
		expect(await investigations.get(investigation.id)).toMatchObject({
			resultId: result.id,
			finishedAt: expect.any(Date),
			acceptedOutput: null,
		});
		expect(await investigations.getUnfinishedForWorkflow(original.id)).toBeNull();
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
	},
);

it('rechecks the background user after execution validation', async () => {
	const { investigation, user } = await prepareInvestigation();
	const references = Container.get(SelfHealingExecutionReferenceService);
	const validateReference = references.validateReference.bind(references);
	vi.spyOn(references, 'validateReference').mockImplementationOnce(async (...args) => {
		await validateReference(...args);
		await Container.get(UserRepository).update(user.id, { disabled: true });
	});
	await expect(service.complete({ investigationId: investigation.id })).rejects.toThrow(
		'edit access',
	);
	expect(await results.count()).toBe(0);
	expect(await suggestions.count()).toBe(0);
});

it.each([0, null])('preserves report text and measured usage with credits=%s', async (credits) => {
	const report = 'Configure the password parameter before retrying: password=example-value.';
	const usage = {
		credits,
		turns: 1,
		durationSeconds: null,
	};
	const { investigation, user, project, original } = await prepareInvestigation(
		'needs_you',
		false,
		{
			report,
			usage,
		},
	);
	const result = await service.complete({ investigationId: investigation.id });
	const detail = await service.getDetail(user, project.id, original.id, result.id);
	expect(detail.report).toBe(report);
	expect(detail.usage).toEqual(usage);
});

it('omits token counts from previously stored usage', async () => {
	const { input, user, project, original, result } = await fixture();
	const storedUsage = {
		...input.usage,
		promptTokens: 1000,
		completionTokens: 200,
		totalTokens: 1200,
	};
	await results.update(result.id, { usage: storedUsage });

	const detail = await service.getDetail(user, project.id, original.id, result.id);
	expect(detail.usage).toEqual(input.usage);
});

it('keeps the report and unknown usage after the execution is removed', async () => {
	const usage = {
		credits: null,
		turns: 2,
		durationSeconds: null,
	};
	const { user, project, original, input, investigation } = await prepareInvestigation(
		'needs_you',
		false,
		{ usage },
	);
	const result = await service.complete({ investigationId: investigation.id });
	await Container.get(ExecutionRepository).delete(input.executionId);
	expect((await results.findOneByOrFail({ id: result.id })).executionId).toBe(input.executionId);
	const detail = await service.getDetail(user, project.id, original.id, result.id);
	expect(detail).toMatchObject({
		report: input.report,
		execution: { status: 'unavailable' },
		usage,
	});
});

it.each(['needs_you', 'could_not_fix'] as const)(
	'dismisses a %s result for every editor without changing its workflow',
	async (outcome) => {
		const { user, project, original, result, url } = await fixture(outcome);
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
	},
);

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

it.each([
	['fix_ready', 'discarded'],
	['needs_you', 'dismissed'],
] as const)(
	'closes a %s result and its pending suggestion together',
	async (outcome, reviewState) => {
		const { user, project, original, result, getDetail } = await fixture(outcome, true);
		await service.dismiss(user, project.id, original.id, result.id);
		expect(await getDetail()).toMatchObject({
			reviewState,
			dismissedById: outcome === 'fix_ready' ? null : user.id,
			suggestion: { state: 'closed', closedReason: 'discarded' },
		});
		expect(
			(await suggestions.getActivity(result.suggestionId!)).map(({ action }) => action),
		).toEqual(['submitted', 'discarded']);
		expect(await workflows.findOneByOrFail({ id: original.id })).toEqual(original);
	},
);

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

it.each([
	['needs_you', 'discarded'],
	['needs_you', 'outdated'],
	['fix_ready', 'discarded'],
	['fix_ready', 'outdated'],
	['fix_ready', 'applied'],
] as const)(
	'keeps a %s result closed as %s when dismissal is requested',
	async (outcome, reason) => {
		const { user, project, original, result, getDetail } = await fixture(outcome, true);
		if (reason === 'discarded') {
			await actions.discard(user, project.id, original.id, result.suggestionId!);
		} else if (reason === 'applied') {
			await actions.apply(user, project.id, original.id, result.suggestionId!);
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
	await expect(service.dismiss(user, project.id, original.id, result.id)).rejects.toThrow(
		'This result is no longer available in this project. Refresh the page.',
	);
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

it('dismisses Fix ready by discarding its suggestion without saving the graph', async () => {
	const { user, original, result, url } = await fixture('fix_ready', true);
	const agent = testServer.authAgentFor(user);
	const response = await agent.post(`${url}/dismiss`);
	expect(response.status).toBe(200);
	expect(response.body.data).toMatchObject({
		reviewState: 'discarded',
		dismissedAt: null,
		suggestion: { state: 'closed', closedReason: 'discarded' },
	});
	const repeated = await agent.post(`${url}/dismiss`).expect(200);
	expect(repeated.body.data).toEqual(response.body.data);
	expect((await suggestions.getActivity(result.suggestionId!)).map(({ action }) => action)).toEqual(
		['submitted', 'discarded'],
	);
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

it.each(['apply', 'approve-and-publish'] as const)(
	'rejects %s for Needs attention',
	async (action) => {
		const { user, original, url } = await fixture('needs_you', true);
		const response = await testServer.authAgentFor(user).post(`${url}/${action}`);
		expect(response.status).toBe(409);
		expect(response.body.message).toBe(
			"This fix isn't ready to apply. Review the report for next steps.",
		);
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

it.each(['apply', 'dismiss'] as const)(
	'keeps detail and %s available without publish scope',
	async (action) => {
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
		await agent.post(`${url}/${action}`).expect(200);
	},
);

it('keeps the report readable when a reviewer loses execution read access', async () => {
	testServer.license.enable('feat:advancedPermissions');
	const { user, project: ownerProject, original, input, result } = await fixture();
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
	expect(initial.body.data.execution).toEqual({ status: 'available', id: input.executionId });

	await linkUserToProject(editor, project, editorRole.slug);
	const detail = await agent.get(url).expect(200);
	expect(detail.body.data).toMatchObject({
		report: input.report,
		execution: { status: 'unavailable' },
	});
	expect(detail.body.data.execution).not.toHaveProperty('id');
});

it('checks execution access against the stored role when the supplied user is stale', async () => {
	const { user, project: ownerProject, original, input, result } = await fixture();
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
	expect(initial.execution).toEqual({ status: 'available', id: input.executionId });

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
