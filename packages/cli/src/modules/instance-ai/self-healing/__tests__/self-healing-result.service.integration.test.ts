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
	GLOBAL_ADMIN_ROLE,
	GLOBAL_MEMBER_ROLE,
	GLOBAL_OWNER_ROLE,
	type Project,
	ProjectRelationRepository,
	ProjectRepository,
	SharedWorkflowRepository,
	TransactionRunner,
	UserRepository,
	WorkflowHistoryRepository,
	WorkflowPublicationOutboxRepository,
	WorkflowPublicationTriggerStatusRepository,
	WorkflowRepository,
	type User,
	type WorkflowEntity,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { ConflictError, NotFoundError } from '@n8n/errors';
import { DataSource } from '@n8n/typeorm';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { randomUUID } from 'node:crypto';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { AuthHandlerRegistry } from '@/auth/auth-handler.registry';
import { CollaborationService } from '@/collaboration/collaboration.service';
import { ControllerRegistry } from '@/controller.registry';
import { WorkflowPublicationNotifier } from '@/workflows/publication/workflow-publication-notifier';
import { WorkflowPublishGuardProxy } from '@n8n/backend-services';
import { WorkflowValidationService } from '@/workflows/workflow-validation.service';
import { WorkflowService } from '@/workflows/workflow.service';
import { createExecution } from '@test-integration/db/executions';
import { createCustomRoleWithScopeSlugs } from '@test-integration/db/roles';
import { createUser } from '@test-integration/db/users';
import { initNodeTypes, setupTestServer } from '@test-integration/utils';

import { InstanceAiSettingsService } from '../../instance-ai-settings.service';
import { InstanceAiService } from '../../instance-ai.service';
import { WorkflowSuggestionActivity } from '../../workflow-suggestions/database/workflow-suggestion-activity.entity';
import { WorkflowSuggestionRepository } from '../../workflow-suggestions/database/workflow-suggestion.repository';
import { WorkflowSuggestionActionsService } from '../../workflow-suggestions/workflow-suggestion-actions.service';
import { WorkflowSuggestionService } from '../../workflow-suggestions/workflow-suggestion.service';
import { SelfHealingResultRepository } from '../database/self-healing-result.repository';
import { SelfHealingInvestigationRepository } from '../database/self-healing-investigation.repository';
import type { SelfHealingRunResult } from '../self-healing-agent.service';
import { SelfHealingExecutionReferenceService } from '../self-healing-execution-reference.service';
import {
	SELF_HEALING_CANNOT_FIX_COOLDOWN_MS,
	SelfHealingInvestigationService,
} from '../self-healing-investigation.service';
import { SelfHealingResultService } from '../self-healing-result.service';
import { SelfHealingConfigurationService } from '../self-healing-configuration.service';
import { SelfHealingConfigurationRepository } from '../database/self-healing-configuration.repository';
import { SelfHealingConfigurationReviewer } from '../database/self-healing-configuration-reviewer.entity';
import { createConfiguration, addReviewer, disableInstanceAdmins } from './support/configuration';

mockInstance(ActiveWorkflowManager);
mockInstance(WorkflowPublicationNotifier);
const validation = mockInstance(WorkflowValidationService);
const runtime = mockInstance(InstanceAiService);

const testServer = setupTestServer({
	modules: ['instance-ai'],
	endpointGroups: ['instance-ai'],
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
	Container.get(GlobalConfig).instanceAi.workflowSuggestionsEnabled = true;
	runtime.startSelfHealingRun.mockReset();
	runtime.routeCancelRun.mockReset();
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

async function completeResult(input: Parameters<SelfHealingResultService['complete']>[0]) {
	const result = await service.complete(input);
	if (!result) throw new Error('Expected a saved result.');
	return result;
}

type Outcome = 'fix_ready' | 'needs_you' | 'could_not_fix';

async function prepareFixture(
	outcome: Outcome = 'needs_you',
	workflowData: Partial<WorkflowEntity> = {},
	inTeamProject = false,
) {
	const user = await createUser();
	let project = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(user.id);
	let owner: User | Project = user;
	if (inTeamProject) {
		project = await createTeamProject(undefined, user);
		owner = project;
	}
	const workflow = await createWorkflowWithHistory(workflowData, owner);
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
	const configuration = await createConfiguration(project.id, user.id);
	const input = {
		configurationId: configuration.id,
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

async function fixture(
	outcome: Outcome = 'needs_you',
	withSuggestion = false,
	content: { workflowData?: Partial<WorkflowEntity>; inTeamProject?: boolean } = {},
) {
	const prepared = await prepareInvestigation(outcome, withSuggestion, content);
	const result = await completeResult({
		investigationId: prepared.investigation.id,
		...prepared.completion,
	});
	if (!result) throw new Error('Expected a saved result.');
	const { user, project, original } = prepared;
	const url = `/projects/${project.id}/workflows/${original.id}/self-healing-results/${result.id}`;
	const getDetail = async () => await service.getDetail(user, project.id, original.id, result.id);
	return { ...prepared, result, url, getDetail };
}

async function prepareInvestigation(
	outcome: Outcome = 'fix_ready',
	withSuggestion: boolean | 'unchanged' = true,
	content: {
		report?: string;
		usage?: SelfHealingResultUsage;
		workflowData?: Partial<WorkflowEntity>;
		inTeamProject?: boolean;
	} = {},
) {
	const { workflowData, inTeamProject, ...resultContent } = content;
	const fixture = await prepareFixture(outcome, workflowData, inTeamProject);
	const { original, user } = fixture;
	const graph =
		withSuggestion === 'unchanged'
			? { nodes: original.nodes, connections: original.connections }
			: fixture.graph;
	const input = { ...fixture.input, ...resultContent };
	const baseline = await suggestionService.captureBaseline(original.id, user.id);
	const investigation = await Container.get(TransactionRunner).run({}, async (ctx) => {
		return await investigations.createInvestigation(
			{
				baseline,
				configurationId: input.configurationId,
				executionId: input.executionId,
				threadId: randomUUID(),
				runId: randomUUID(),
			},
			ctx,
		);
	});
	const completion: Omit<Parameters<SelfHealingResultService['complete']>[0], 'investigationId'> = {
		baseline,
		output: {
			outcome,
			summary: input.summary,
			report: input.report,
			candidateFilePath: withSuggestion ? 'candidate.workflow.ts' : null,
		},
		usage: input.usage,
		completedAt: new Date().toISOString(),
		...(withSuggestion ? { candidate: { graph } } : {}),
	};
	return { ...fixture, graph, input, baseline, investigation, completion };
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
			expect(first?.kind).toBe('investigation');
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

describe('investigation eligibility after a result', () => {
	async function nextFailure(input: { workflowId: string; projectId: string }) {
		const workflow = await workflows.findOneByOrFail({ id: input.workflowId });
		const execution = await createExecution(
			{ status: 'error', mode: 'trigger', workflowVersionId: workflow.versionId },
			workflow,
		);

		return { ...input, executionId: execution.id };
	}

	async function createHistoryVersion(workflow: WorkflowEntity) {
		const versionId = randomUUID();
		await Container.get(WorkflowHistoryRepository).insert({
			workflowId: workflow.id,
			versionId,
			nodes: workflow.nodes,
			connections: workflow.connections,
			authors: 'Test',
		});
		return versionId;
	}

	async function markTriggerActivated(workflow: WorkflowEntity, versionId: string) {
		await Container.get(WorkflowPublicationTriggerStatusRepository).replaceForWorkflow(
			workflow.id,
			[
				{
					nodeId: workflow.nodes[0].id,
					versionId,
					status: 'activated',
					triggerKind: 'persisted',
					errorMessage: null,
				},
			],
		);
	}

	it.each([
		['needs_you', false],
		['needs_you', true],
		['fix_ready', true],
	] as const)(
		'blocks an open %s result with suggestion=%s until dismissal',
		async (outcome, withSuggestion) => {
			const { input, result, user, project, original } = await fixture(outcome, withSuggestion);
			const producer = Container.get(SelfHealingInvestigationService);
			const failure = await nextFailure(input);

			await expect(producer.start(failure)).resolves.toEqual({
				kind: 'result',
				resultId: result.id,
			});
			expect(runtime.startSelfHealingRun).not.toHaveBeenCalled();

			await service.dismiss(user, project.id, original.id, result.id);

			expect(runtime.startSelfHealingRun).not.toHaveBeenCalled();

			await expect(producer.start(failure)).resolves.toMatchObject({ kind: 'investigation' });
			expect(runtime.startSelfHealingRun).toHaveBeenCalledTimes(1);

			await expect(producer.start(input)).resolves.toMatchObject({ kind: 'investigation' });
			expect(runtime.startSelfHealingRun).toHaveBeenCalledTimes(1);
		},
	);

	it('skips failures until 24 hours without extending the cooldown or using credits', async () => {
		const { input, result, user, project, original } = await fixture('could_not_fix');
		const producer = Container.get(SelfHealingInvestigationService);
		const expiresAt = result.completedAt.getTime() + SELF_HEALING_CANNOT_FIX_COOLDOWN_MS;
		const now = vi.spyOn(Date, 'now').mockReturnValue(expiresAt - 60_000);

		await expect(producer.start(await nextFailure(input))).resolves.toBeNull();
		await service.dismiss(user, project.id, original.id, result.id);

		now.mockReturnValue(expiresAt - 1);
		await expect(producer.start(await nextFailure(input))).resolves.toBeNull();
		expect(await results.findOneByOrFail({ id: result.id })).toEqual(result);
		expect(await investigations.count()).toBe(1);
		expect(await results.count()).toBe(1);
		expect(runtime.startSelfHealingRun).not.toHaveBeenCalled();

		now.mockReturnValue(expiresAt);
		await expect(producer.start(await nextFailure(input))).resolves.toMatchObject({
			kind: 'investigation',
		});
		expect(runtime.startSelfHealingRun).toHaveBeenCalledTimes(1);
	});

	it('starts a new cooldown from the latest accepted cannot-fix result', async () => {
		const { input, result, completion } = await fixture('could_not_fix');
		const producer = Container.get(SelfHealingInvestigationService);
		const expiresAt = result.completedAt.getTime() + SELF_HEALING_CANNOT_FIX_COOLDOWN_MS;
		const now = vi.spyOn(Date, 'now').mockReturnValue(expiresAt);

		const admitted = await producer.start(await nextFailure(input));
		if (admitted?.kind !== 'investigation') throw new Error('Expected a new investigation.');

		const completedAt = expiresAt + 60_000;
		await completeResult({
			investigationId: admitted.investigationId,
			...completion,
			completedAt: new Date(completedAt).toISOString(),
		});

		const nextExpiresAt = completedAt + SELF_HEALING_CANNOT_FIX_COOLDOWN_MS;
		now.mockReturnValue(nextExpiresAt - 1);
		await expect(producer.start(await nextFailure(input))).resolves.toBeNull();
		expect(runtime.startSelfHealingRun).toHaveBeenCalledTimes(1);

		now.mockReturnValue(nextExpiresAt);
		await expect(producer.start(await nextFailure(input))).resolves.toMatchObject({
			kind: 'investigation',
		});
		expect(runtime.startSelfHealingRun).toHaveBeenCalledTimes(2);
	});

	it.each(['before expiry', 'at expiry', 'new publication'] as const)(
		'checks cooldowns for a workflow with escaped characters in pin data: %s',
		async (scenario) => {
			const { input, result, original } = await fixture('could_not_fix', false, {
				workflowData: {
					pinData: { 'Schedule Trigger': [{ json: { value: 'before\u0000after' } }] },
				},
			});
			const elapsed = scenario === 'at expiry' ? SELF_HEALING_CANNOT_FIX_COOLDOWN_MS : 60_000;
			vi.spyOn(Date, 'now').mockReturnValue(result.completedAt.getTime() + elapsed);

			if (scenario === 'new publication') {
				const versionId = await createHistoryVersion(original);
				await workflows.update(original.id, { versionId, activeVersionId: versionId, pinData: {} });
				await markTriggerActivated(original, versionId);
			}

			const response = await Container.get(SelfHealingInvestigationService).start(
				await nextFailure(input),
			);

			if (scenario === 'before expiry') {
				expect(response).toBeNull();
				expect(runtime.startSelfHealingRun).not.toHaveBeenCalled();
			} else {
				expect(response).toMatchObject({ kind: 'investigation' });
				expect(runtime.startSelfHealingRun).toHaveBeenCalledTimes(1);
			}
		},
	);

	it('admits only one concurrent investigation when the cooldown expires', async () => {
		const { input, result } = await fixture('could_not_fix');
		const producer = Container.get(SelfHealingInvestigationService);
		const first = await nextFailure(input);
		const second = await nextFailure(input);
		vi.spyOn(Date, 'now').mockReturnValue(
			result.completedAt.getTime() + SELF_HEALING_CANNOT_FIX_COOLDOWN_MS,
		);

		const admitted = await Promise.all([producer.start(first), producer.start(second)]);

		expect(admitted[0]).toMatchObject({ kind: 'investigation' });
		expect(admitted[1]).toEqual(admitted[0]);
		expect(runtime.startSelfHealingRun).toHaveBeenCalledTimes(1);
		expect(await investigations.count()).toBe(2);
	});

	it('retains the cooldown after execution pruning and same-version republication', async () => {
		const { input, result, user, original } = await fixture('could_not_fix');
		await Container.get(ExecutionRepository).delete(input.executionId);
		await Container.get(WorkflowService).deactivateWorkflow(user, original.id);
		await Container.get(WorkflowService).activateWorkflow(user, original.id, {
			versionId: original.versionId,
		});
		await Container.get(WorkflowPublicationOutboxRepository).update(
			{ workflowId: original.id },
			{ status: 'completed' },
		);
		await markTriggerActivated(original, original.versionId);

		await expect(
			Container.get(SelfHealingInvestigationService).start(await nextFailure(input)),
		).resolves.toBeNull();
		expect(await results.findOneByOrFail({ id: result.id })).toEqual(result);
		expect(runtime.startSelfHealingRun).not.toHaveBeenCalled();
	});

	it('skips a cooldown failure with a saved draft before capturing a baseline', async () => {
		const { input, original } = await fixture('could_not_fix');
		const versionId = await createHistoryVersion(original);
		await workflows.update(original.id, { versionId });
		const captureBaseline = vi.spyOn(suggestionService, 'captureBaseline');

		await expect(
			Container.get(SelfHealingInvestigationService).start(await nextFailure(input)),
		).resolves.toBeNull();
		expect(captureBaseline).not.toHaveBeenCalled();
		expect(runtime.startSelfHealingRun).not.toHaveBeenCalled();
	});

	it.each(['could_not_fix', 'fix_ready'] as const)(
		'admits a new failure after a different version is published: %s',
		async (outcome) => {
			const { input, result, original } = await fixture(outcome, outcome === 'fix_ready');
			const versionId = await createHistoryVersion(original);
			await workflows.update(original.id, { versionId, activeVersionId: versionId });
			const producer = Container.get(SelfHealingInvestigationService);
			await expect(producer.start(await nextFailure(input))).rejects.toThrow('fully published');
			expect(runtime.startSelfHealingRun).not.toHaveBeenCalled();

			await markTriggerActivated(original, versionId);

			const failure = await nextFailure(input);
			const response = await producer.start(failure);

			expect(response?.kind).toBe('investigation');
			expect(runtime.startSelfHealingRun).toHaveBeenCalledTimes(1);
			if (outcome === 'fix_ready') {
				const suggestion = await suggestions.findOneByOrFail({ id: result.suggestionId! });
				expect(suggestion.closedReason).toBe('outdated');
			}
		},
	);

	it('requires successful publication after Apply before admitting another failure', async () => {
		const { input, user, project, original, result } = await fixture('fix_ready', true);
		const producer = Container.get(SelfHealingInvestigationService);

		await actions.apply(user, project.id, original.id, result.suggestionId!);
		const failureAfterApply = await nextFailure(input);

		await expect(producer.start(failureAfterApply)).rejects.toThrow('fully published');
		expect(runtime.startSelfHealingRun).not.toHaveBeenCalled();

		const draft = await workflows.findOneByOrFail({ id: original.id });
		await workflows.update(original.id, { activeVersionId: draft.versionId });
		const failureBeforeActivation = await nextFailure(input);

		await expect(producer.start(failureBeforeActivation)).rejects.toThrow('fully published');

		await Container.get(WorkflowPublicationTriggerStatusRepository).replaceForWorkflow(
			original.id,
			[
				{
					nodeId: draft.nodes[0].id,
					versionId: draft.versionId,
					status: 'activated',
					triggerKind: 'persisted',
					errorMessage: null,
				},
			],
		);
		expect(runtime.startSelfHealingRun).not.toHaveBeenCalled();

		const failureAfterPublication = await nextFailure(input);
		await expect(producer.start(failureAfterPublication)).resolves.toMatchObject({
			kind: 'investigation',
		});
	});

	it('preserves the block across configuration edits and resets it on deletion', async () => {
		const { input, user, project, original, result } = await fixture('could_not_fix');
		const configurationService = Container.get(SelfHealingConfigurationService);
		const producer = Container.get(SelfHealingInvestigationService);
		const cooldown = vi.spyOn(results, 'isInCooldown');

		await configurationService.setEnabled(user, project.id, input.configurationId, false);
		await configurationService.setEnabled(user, project.id, input.configurationId, true);
		await configurationService.save(
			user,
			project.id,
			{
				scope: 'selected',
				enabled: true,
				workflowIds: [original.id],
				reviewerIds: [user.id],
				includeAllProjectMembers: false,
			},
			input.configurationId,
		);
		const failureAfterEdit = await nextFailure(input);

		await expect(producer.start(failureAfterEdit)).resolves.toBeNull();
		expect(cooldown).toHaveBeenCalledTimes(1);
		await expect(cooldown.mock.results[0].value).resolves.toBe(true);

		// The all-workflows configuration now covers this workflow instead.
		const otherWorkflow = await createWorkflowWithHistory({}, user);
		await configurationService.save(
			user,
			project.id,
			{
				scope: 'selected',
				enabled: true,
				workflowIds: [otherWorkflow.id],
				reviewerIds: [user.id],
				includeAllProjectMembers: false,
			},
			input.configurationId,
		);
		await createConfiguration(project.id, user.id);
		const failureAfterReplacement = await nextFailure(input);

		await expect(producer.start(failureAfterReplacement)).resolves.toBeNull();
		expect(cooldown).toHaveBeenCalledTimes(2);
		await expect(cooldown.mock.results[1].value).resolves.toBe(true);

		await configurationService.remove(project.id, input.configurationId);

		await expect(producer.start(input)).resolves.toMatchObject({ kind: 'investigation' });
		expect(await results.findOneBy({ id: result.id })).toBeNull();
	});

	it('does not block a moved workflow with an inaccessible old-project report', async () => {
		const { input, user, project, original } = await fixture('could_not_fix');
		const destination = await createTeamProject(undefined, user);
		await Container.get(SharedWorkflowRepository).update(
			{ workflowId: original.id, projectId: project.id },
			{ projectId: destination.id },
		);
		await createConfiguration(destination.id, user.id);
		const failure = await nextFailure({ ...input, projectId: destination.id });

		await expect(
			Container.get(SelfHealingInvestigationService).start(failure),
		).resolves.toMatchObject({ kind: 'investigation' });
	});

	it.each(['errored', 'max-iterations'] as const)(
		'allows a new failure after %s without retrying the same execution',
		async (reason) => {
			const { input } = await prepareFixture();
			const producer = Container.get(SelfHealingInvestigationService);
			runtime.startSelfHealingRun.mockImplementation(async (_input, lifecycle) => {
				const run: SelfHealingRunResult = {
					threadId: lifecycle.threadId,
					runId: lifecycle.runId,
					status: reason === 'errored' ? 'errored' : 'completed',
					finishReason: reason === 'max-iterations' ? reason : undefined,
					usage: { credits: 1, turns: 3, durationSeconds: 10 },
				};
				await lifecycle.onComplete(run, new AbortController().signal);
				return run;
			});

			const first = await producer.start(input);
			await vi.waitFor(async () =>
				expect(await investigations.getUnfinishedForWorkflow(input.workflowId)).toBeNull(),
			);

			await expect(producer.start(input)).resolves.toEqual(first);
			expect(runtime.startSelfHealingRun).toHaveBeenCalledTimes(1);

			const failure = await nextFailure(input);
			await expect(producer.start(failure)).resolves.toMatchObject({
				kind: 'investigation',
			});
			await vi.waitFor(async () =>
				expect(await investigations.getUnfinishedForWorkflow(input.workflowId)).toBeNull(),
			);
			expect(runtime.startSelfHealingRun).toHaveBeenCalledTimes(2);
			expect(await results.count()).toBe(0);
		},
	);
});

it('returns committed completion without repeating access or execution checks', async () => {
	const { investigation, user, completion } = await prepareInvestigation();
	const result = await completeResult({ investigationId: investigation.id, ...completion });
	await Container.get(UserRepository).update(user.id, { disabled: true });
	await Container.get(ExecutionRepository).delete(investigation.executionId);
	expect(
		await service.complete({ investigationId: investigation.id, ...completion }),
	).toMatchObject({
		id: result.id,
	});
	expect(await results.count()).toBe(1);
	expect(await suggestions.count()).toBe(1);
});

it('commits concurrent finalization only once', async () => {
	const { investigation, completion } = await prepareInvestigation();
	const completed = await Promise.all([
		completeResult({ investigationId: investigation.id, ...completion }),
		completeResult({ investigationId: investigation.id, ...completion }),
	]);
	expect(completed[0].id).toBe(completed[1].id);
	expect(await results.count()).toBe(1);
	expect(await suggestions.count()).toBe(1);
	expect(await Container.get(DataSource).getRepository(WorkflowSuggestionActivity).count()).toBe(1);
});

it.each(['preparation', 'transaction'] as const)(
	'discards a completion canceled during %s',
	async (phase) => {
		const { investigation, completion } = await prepareInvestigation();
		const controller = new AbortController();
		if (phase === 'preparation') {
			const prepare = suggestionService.prepareSuggestion.bind(suggestionService);
			vi.spyOn(suggestionService, 'prepareSuggestion').mockImplementationOnce(async (...args) => {
				const result = await prepare(...args);
				controller.abort(new Error('Investigation canceled.'));
				return result;
			});
		} else {
			const complete = investigations.completeWithResult.bind(investigations);
			vi.spyOn(investigations, 'completeWithResult').mockImplementationOnce(async (...args) => {
				await complete(...args);
				controller.abort(new Error('Investigation canceled.'));
			});
		}

		await expect(
			service.complete({
				investigationId: investigation.id,
				...completion,
				signal: controller.signal,
			}),
		).rejects.toThrow('Investigation canceled.');
		expect(await results.count()).toBe(0);
		expect(await suggestions.count()).toBe(0);
		expect(await Container.get(DataSource).getRepository(WorkflowSuggestionActivity).count()).toBe(
			0,
		);
		expect(await investigations.findOneByOrFail({ id: investigation.id })).toMatchObject({
			resultId: null,
			finishedAt: null,
		});
	},
);

it('rolls back all completion writes and releases the claim on failure', async () => {
	const { input, original, graph } = await prepareFixture('fix_ready');
	const value = ['xoxb', '1234567890', 'abcdefghij'].join('-');
	let completedRun: Promise<SelfHealingRunResult> | undefined;
	runtime.startSelfHealingRun.mockImplementation(async (_input, lifecycle) => {
		const run: SelfHealingRunResult = {
			threadId: lifecycle.threadId,
			runId: lifecycle.runId,
			status: 'completed',
			finishReason: 'stop',
			output: {
				outcome: 'fix_ready',
				summary: `Updated the request using ${value}.`,
				report: `Check the HTTP Request node. Authorization: Bearer ${value}`,
				candidateFilePath: 'candidate.workflow.ts',
			},
			usage: input.usage,
			candidate: {
				filePath: 'candidate.workflow.ts',
				compile: async () => ({
					success: true,
					workflow: { ...original, ...graph },
					warnings: [],
					credentialResolution: {
						mockedNodeNames: [],
						mockedCredentialTypes: [],
						mockedCredentialsByNode: {},
						heldForNewCredentialTypes: [],
						resolvedCredentialsByNode: {},
					},
				}),
			},
		};
		completedRun = lifecycle.onComplete(run, new AbortController().signal).then(() => run);
		return await completedRun;
	});
	const completeWithResult = investigations.completeWithResult.bind(investigations);
	vi.spyOn(investigations, 'completeWithResult').mockImplementationOnce(async (...args) => {
		await completeWithResult(...args);
		throw new Error('Completion unavailable.');
	});
	const started = await Container.get(SelfHealingInvestigationService).start(input);
	if (!started || started.kind !== 'investigation') throw new Error('Expected an investigation.');
	await vi.waitFor(() => expect(completedRun).toBeDefined());
	await expect(completedRun).rejects.toThrow('Completion unavailable.');
	const investigation = await investigations.findOneByOrFail({ id: started.investigationId });
	expect(await results.count()).toBe(0);
	expect(await suggestions.count()).toBe(0);
	expect(await Container.get(DataSource).getRepository(WorkflowSuggestionActivity).count()).toBe(0);
	await vi.waitFor(async () => {
		expect(await investigations.findOneByOrFail({ id: investigation.id })).toMatchObject({
			resultId: null,
			finishedAt: expect.any(Date),
		});
	});
	expect(runtime.startSelfHealingRun).toHaveBeenCalledTimes(1);
});

it('rejects a changed baseline when saving a completed report', async () => {
	const { investigation, original, completion } = await prepareInvestigation('needs_you', false);
	await workflows.update(original.id, { name: 'Changed before completion' });
	await expect(
		service.complete({ investigationId: investigation.id, ...completion }),
	).rejects.toThrow('baseline');
	expect(await results.count()).toBe(0);
	expect((await investigations.findOneByOrFail({ id: investigation.id })).finishedAt).toBeNull();
});

it('rejects a baseline from another investigation', async () => {
	const { investigation, completion } = await prepareInvestigation('could_not_fix', false);
	const baseline = structuredClone(completion.baseline);
	baseline.expectedBaseline.publishedVersionId = randomUUID();
	await expect(
		service.complete({ investigationId: investigation.id, ...completion, baseline }),
	).rejects.toThrow('does not belong');
	expect(await results.count()).toBe(0);
});

it('rejects completion after interrupted-run cleanup', async () => {
	const { investigation, completion } = await prepareInvestigation('could_not_fix', false);
	await investigations.finishWithoutResult(investigation.id);
	await expect(
		service.complete({ investigationId: investigation.id, ...completion }),
	).rejects.toThrow('already finished');
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
		expect(await investigations.findOneByOrFail({ id: investigation.id })).toMatchObject({
			resultId: result.id,
			finishedAt: expect.any(Date),
		});
		expect(await investigations.getUnfinishedForWorkflow(original.id)).toBeNull();
		const response = await testServer.authAgentFor(user).get(url);
		expect(response.status).toBe(200);
		expect(response.body.data).toMatchObject({
			resultId: result.id,
			outcome,
			report: input.report,
			reviewState: outcome === 'could_not_fix' ? 'closed' : 'open',
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

it('preserves a needs_you report when the candidate has no changes', async () => {
	const { investigation, input, user, project, original, completion } = await prepareInvestigation(
		'needs_you',
		'unchanged',
	);
	const result = await completeResult({ investigationId: investigation.id, ...completion });
	const detail = await service.getDetail(user, project.id, original.id, result.id);
	expect(detail).toMatchObject({
		outcome: 'needs_you',
		summary: input.summary,
		report: input.report,
		suggestion: null,
	});
	expect(await results.count()).toBe(1);
	expect(await suggestions.count()).toBe(0);
	expect(await investigations.findOneByOrFail({ id: investigation.id })).toMatchObject({
		resultId: result.id,
		finishedAt: expect.any(Date),
	});
});

it('rejects a fix_ready candidate with no changes', async () => {
	const { investigation, completion } = await prepareInvestigation('fix_ready', 'unchanged');
	await expect(
		service.complete({ investigationId: investigation.id, ...completion }),
	).rejects.toThrow('no workflow changes');
	expect(await results.count()).toBe(0);
	expect(await suggestions.count()).toBe(0);
});

it('rechecks the background user after execution validation', async () => {
	const { investigation, user, completion } = await prepareInvestigation();
	const references = Container.get(SelfHealingExecutionReferenceService);
	const validateReference = references.validateReference.bind(references);
	vi.spyOn(references, 'validateReference').mockImplementationOnce(async (...args) => {
		await validateReference(...args);
		await Container.get(UserRepository).update(user.id, { disabled: true });
	});
	await expect(
		service.complete({ investigationId: investigation.id, ...completion }),
	).resolves.toBeNull();
	expect(await results.count()).toBe(0);
	expect(await suggestions.count()).toBe(0);
});

it.each<SelfHealingResultUsage>([
	{ credits: 0, turns: 1, durationSeconds: null },
	{ credits: null, turns: 1, durationSeconds: null },
	{
		promptTokens: 10,
		completionTokens: 5,
		totalTokens: 15,
		turns: 1,
		durationSeconds: 2,
	},
	{
		promptTokens: null,
		completionTokens: null,
		totalTokens: null,
		turns: 1,
		durationSeconds: null,
	},
])('preserves report text and usage: %j', async (usage) => {
	const report = 'Configure the credential for the HTTP Request node before retrying.';
	const { investigation, user, project, original, completion } = await prepareInvestigation(
		'needs_you',
		false,
		{
			report,
			usage,
		},
	);
	const result = await completeResult({ investigationId: investigation.id, ...completion });
	const detail = await service.getDetail(user, project.id, original.id, result.id);
	expect(detail.report).toBe(report);
	expect(detail.usage).toEqual(usage);
});

it('keeps the report and unknown usage after the execution is removed', async () => {
	const usage = {
		credits: null,
		turns: 2,
		durationSeconds: null,
	};
	const { user, project, original, input, investigation, completion } = await prepareInvestigation(
		'needs_you',
		false,
		{ usage },
	);
	const result = await completeResult({ investigationId: investigation.id, ...completion });
	await Container.get(ExecutionRepository).delete(input.executionId);
	expect((await results.findOneByOrFail({ id: result.id })).executionId).toBe(input.executionId);
	const detail = await service.getDetail(user, project.id, original.id, result.id);
	expect(detail).toMatchObject({
		report: input.report,
		execution: { status: 'unavailable' },
		usage,
	});
});

it.each([
	['needs_you', 'dismissed'],
	['could_not_fix', 'closed'],
] as const)(
	'handles dismissal of %s without changing its workflow',
	async (outcome, reviewState) => {
		const { user, project, original, result, url } = await fixture(outcome, false, {
			inTeamProject: true,
		});
		const editor = await createUser();
		await addReviewer(result.configurationId, editor.id);
		await linkUserToProject(editor, project, 'project:editor');
		const response = await testServer.authAgentFor(user).post(`${url}/dismiss`);
		expect(response.status).toBe(200);
		expect(response.body.data.reviewState).toBe(reviewState);
		const firstDismissal = await results.findOneByOrFail({ id: result.id });
		if (outcome === 'could_not_fix') {
			expect(firstDismissal).toEqual({ ...result, dismissedAt: null, dismissedById: null });
		}
		const repeated = service.dismiss(editor, project.id, original.id, result.id);
		if (outcome === 'needs_you') {
			await expect(repeated).rejects.toBeInstanceOf(ConflictError);
		} else {
			await repeated;
		}
		expect(await results.findOneByOrFail({ id: result.id })).toEqual(firstDismissal);
		expect((await service.getDetail(editor, project.id, original.id, result.id)).reviewState).toBe(
			reviewState,
		);
		expect(await workflows.findOneByOrFail({ id: original.id })).toEqual(original);
	},
);

it('returns a recorded dismissal of a could_not_fix result as dismissed', async () => {
	const { user, result, getDetail } = await fixture('could_not_fix');
	await results.update(result.id, { dismissedAt: new Date(), dismissedById: user.id });

	expect(await getDetail()).toMatchObject({ reviewState: 'dismissed', dismissedById: user.id });
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
	const [dismissOutcome, discardOutcome] = await Promise.allSettled([
		service.dismiss(user, project.id, original.id, result.id),
		actions.discardPending(user, project.id, original.id, result.suggestionId!),
	]);
	const directlyDiscarded =
		discardOutcome.status === 'fulfilled' && discardOutcome.value === 'discarded';
	expect(dismissOutcome.status).toBe(directlyDiscarded ? 'rejected' : 'fulfilled');
	if (dismissOutcome.status === 'rejected') {
		expect(dismissOutcome.reason).toBeInstanceOf(ConflictError);
	}
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
		const dismissal = service.dismiss(user, project.id, original.id, result.id);
		if (reason === 'outdated') {
			expect((await dismissal).reviewState).toBe(reason);
		} else {
			await expect(dismissal).rejects.toBeInstanceOf(ConflictError);
		}
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
		await agent.post(`${url}/${action}`).set('push-ref', 'review-editor').expect(409);
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
	await agent.post(`${url}/dismiss`).expect(409);
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

describe('competing reviewers', () => {
	type Action = 'apply' | 'approve-and-publish' | 'dismiss';

	async function reviewersFor(outcome: Outcome, withSuggestion: boolean) {
		const context = await fixture(outcome, withSuggestion, { inTeamProject: true });
		const editor = await createUser();
		await linkUserToProject(editor, context.project, 'project:editor');
		await addReviewer(context.result.configurationId, editor.id);
		const review = async (reviewer: typeof editor, action: Action) =>
			action === 'dismiss'
				? await service.dismiss(
						reviewer,
						context.project.id,
						context.original.id,
						context.result.id,
					)
				: await service.act(
						reviewer,
						context.project.id,
						context.original.id,
						context.result.id,
						action,
					);
		return { ...context, editor, review };
	}

	it.each([
		{ outcome: 'fix_ready', withSuggestion: true, first: 'apply', stale: 'apply' },
		{ outcome: 'fix_ready', withSuggestion: true, first: 'apply', stale: 'approve-and-publish' },
		{ outcome: 'fix_ready', withSuggestion: true, first: 'dismiss', stale: 'apply' },
		{ outcome: 'needs_you', withSuggestion: true, first: 'apply', stale: 'apply' },
		{ outcome: 'needs_you', withSuggestion: true, first: 'dismiss', stale: 'apply' },
		{ outcome: 'needs_you', withSuggestion: false, first: 'dismiss', stale: 'dismiss' },
	] as const)(
		'rejects a stale $stale after $first closed $outcome with proposal=$withSuggestion',
		async ({ outcome, withSuggestion, first, stale }) => {
			const { user, editor, original, result, url, review } = await reviewersFor(
				outcome,
				withSuggestion,
			);
			const publish = vi.spyOn(Container.get(WorkflowService), 'activateWorkflow');
			await review(editor, first);
			const receipt = await results.findOneByOrFail({ id: result.id });
			const saved = await workflows.findOneByOrFail({ id: original.id });
			const historyCount = await Container.get(WorkflowHistoryRepository).countBy({
				workflowId: original.id,
			});

			const response = await testServer
				.authAgentFor(user)
				.post(`${url}/${stale}`)
				.set('push-ref', 'review-editor');

			expect(response.status).toBe(409);
			expect(await results.findOneByOrFail({ id: result.id })).toEqual(receipt);
			expect(await workflows.findOneByOrFail({ id: original.id })).toEqual(saved);
			expect(
				await Container.get(WorkflowHistoryRepository).countBy({ workflowId: original.id }),
			).toBe(historyCount);
			expect(publish).not.toHaveBeenCalled();
		},
	);

	it('rejects a report dismissal that loses the dismissal write', async () => {
		const { user, editor, result, review } = await reviewersFor('needs_you', false);
		// SQLite serializes write transactions. Supply the earlier snapshot after the winner commits.
		await review(editor, 'dismiss');
		vi.spyOn(results, 'getResult').mockResolvedValueOnce(result);

		await expect(review(user, 'dismiss')).rejects.toBeInstanceOf(ConflictError);

		expect(await results.findOneByOrFail({ id: result.id })).toMatchObject({
			dismissedById: editor.id,
		});
	});

	it.each(['apply', 'approve-and-publish'] as const)(
		'rejects %s when another reviewer applies after the proposal read',
		async (action) => {
			const { user, editor, original, graph, review } = await reviewersFor('fix_ready', true);
			const publish = vi.spyOn(Container.get(WorkflowService), 'activateWorkflow');
			const reconcile = suggestionService.reconcilePending.bind(suggestionService);
			vi.spyOn(suggestionService, 'reconcilePending').mockImplementationOnce(async (...args) => {
				const pending = await reconcile(...args);
				await review(editor, 'apply');
				return pending;
			});
			const historyCount = await Container.get(WorkflowHistoryRepository).countBy({
				workflowId: original.id,
			});

			await expect(review(user, action)).rejects.toBeInstanceOf(ConflictError);

			expect((await workflows.findOneByOrFail({ id: original.id })).nodes).toEqual(graph.nodes);
			expect(
				await Container.get(WorkflowHistoryRepository).countBy({ workflowId: original.id }),
			).toBe(historyCount + 1);
			expect(publish).not.toHaveBeenCalled();
		},
	);
});

it('applies Needs attention changes to the draft without publishing', async () => {
	const { user, original, url } = await fixture('needs_you', true);
	const publish = vi.spyOn(Container.get(WorkflowService), 'activateWorkflow');
	const response = await testServer.authAgentFor(user).post(`${url}/apply`);
	expect(response.status).toBe(200);
	expect(response.body.data).toMatchObject({
		reviewState: 'applied',
		suggestion: { appliedVersion: { action: 'apply' } },
	});
	expect((await workflows.findOneByOrFail({ id: original.id })).activeVersionId).toBe(
		original.activeVersionId,
	);
	expect(publish).not.toHaveBeenCalled();
});

it('rejects approve-and-publish for Needs attention', async () => {
	const { user, original, url } = await fixture('needs_you', true);
	const response = await testServer.authAgentFor(user).post(`${url}/approve-and-publish`);
	expect(response.status).toBe(409);
	expect(response.body.message).toBe(
		"This fix isn't ready to apply. Review the report for next steps.",
	);
	expect(await workflows.findOneByOrFail({ id: original.id })).toEqual(original);
});

it('allows assigned project viewers with a workflow share to review', async () => {
	testServer.license.enable('feat:sharing');
	const { original, project, result, url } = await fixture('needs_you', false, {
		inTeamProject: true,
	});
	const editor = await createUser();
	await addReviewer(result.configurationId, editor.id);
	await linkUserToProject(editor, project, 'project:viewer');
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
		const { project, result, url } = await fixture('fix_ready', true, { inTeamProject: true });
		const editor = await createUser();
		await addReviewer(result.configurationId, editor.id);
		const role = await createCustomRoleWithScopeSlugs(['workflow:read', 'workflow:update']);
		await linkUserToProject(editor, project, role.slug);
		const agent = testServer.authAgentFor(editor);
		await agent.get(url).expect(200);
		await agent.post(`${url}/approve-and-publish`).expect(403);
		await agent.post(`${url}/${action}`).expect(200);
	},
);

it.each([
	{ outcome: 'fix_ready', action: 'apply', reviewState: 'applied' },
	{ outcome: 'needs_you', action: 'dismiss', reviewState: 'dismissed' },
] as const)(
	'lets a project viewer who edits through a share continue $reviewState',
	async ({ outcome, action, reviewState }) => {
		testServer.license.enable('feat:advancedPermissions');
		vi.spyOn(Container.get(InstanceAiSettingsService), 'isInstanceAiEnabled').mockReturnValue(true);
		const { user, original, project, result, url } = await fixture(
			outcome,
			outcome === 'fix_ready',
			{ inTeamProject: true },
		);
		const editor = await createUser();
		await addReviewer(result.configurationId, editor.id);
		await linkUserToProject(editor, project, 'project:viewer');
		const team = await createTeamProject(undefined, user);
		const role = await createCustomRoleWithScopeSlugs(['workflow:read', 'workflow:update']);
		await linkUserToProject(editor, team, role.slug);
		await Container.get(SharedWorkflowRepository).save({
			workflowId: original.id,
			projectId: team.id,
			role: 'workflow:editor',
		});
		const editorProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			editor.id,
		);
		const agent = testServer.authAgentFor(editor);
		const openChat = async (projectId: string) =>
			await agent.post('/instance-ai/threads').send({
				threadId: randomUUID(),
				projectId,
				source: 'self_healing_result',
				origin: 'internal',
			});

		const response = await agent.post(`${url}/${action}`).expect(200);

		expect(response.body.data).toMatchObject({ reviewState, projectId: project.id });
		expect((await openChat(project.id)).status).toBe(200);
		expect((await openChat(editorProject.id)).status).toBe(200);
	},
);

it('keeps the report readable when a reviewer loses execution read access', async () => {
	testServer.license.enable('feat:advancedPermissions');
	const { project, input, result, url } = await fixture('needs_you', false, {
		inTeamProject: true,
	});
	const editor = await createUser();
	await addReviewer(result.configurationId, editor.id);
	const readerRole = await createCustomRoleWithScopeSlugs([
		'workflow:read',
		'workflow:update',
		'execution:read',
	]);
	const editorRole = await createCustomRoleWithScopeSlugs(['workflow:read', 'workflow:update']);
	await linkUserToProject(editor, project, readerRole.slug);
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
	const { project, original, input, result } = await fixture('needs_you', false, {
		inTeamProject: true,
	});
	const reviewer = await createUser({ role: GLOBAL_OWNER_ROLE });
	await addReviewer(result.configurationId, reviewer.id);
	const role = await createCustomRoleWithScopeSlugs(['workflow:read', 'workflow:update']);
	await linkUserToProject(reviewer, project, role.slug);
	const initial = await service.getDetail(reviewer, project.id, original.id, result.id);
	expect(initial.execution).toEqual({ status: 'available', id: input.executionId });

	await Container.get(UserRepository).update(reviewer.id, { role: GLOBAL_MEMBER_ROLE });
	expect(reviewer.role.slug).toBe(GLOBAL_OWNER_ROLE.slug);
	const detail = await service.getDetail(reviewer, project.id, original.id, result.id);
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
	expect(await results.getResult(result.id, result)).toEqual(result);
	expect(await workflows.findOneByOrFail({ id: original.id })).toEqual(original);
});

describe('Inbox source reads', () => {
	async function addResult({
		original,
		baseline,
		investigation,
		completion,
	}: Awaited<ReturnType<typeof fixture>>) {
		const execution = await createExecution(
			{ status: 'error', mode: 'trigger', workflowVersionId: original.versionId },
			original,
		);
		const next = await Container.get(TransactionRunner).run(
			{},
			async (ctx) =>
				await investigations.createInvestigation(
					{
						baseline,
						configurationId: investigation.configurationId,
						executionId: execution.id,
						threadId: randomUUID(),
						runId: randomUUID(),
					},
					ctx,
				),
		);
		return await completeResult({ investigationId: next.id, ...completion });
	}

	it.each([
		['fix_ready', true],
		['needs_you', true],
		['needs_you', false],
		['could_not_fix', false],
	] as const)(
		'lists one compact row for %s with suggestion=%s',
		async (outcome, withSuggestion) => {
			const { user, original, result, input } = await fixture(outcome, withSuggestion);
			const [state, otherState] =
				outcome === 'could_not_fix' ? (['closed', 'open'] as const) : (['open', 'closed'] as const);
			const rows = await service.listForInbox(user, { state, limit: 10 });
			expect(rows).toEqual([
				{
					type: 'self_healing_result',
					id: result.id,
					state,
					projectId: result.projectId,
					workflowId: original.id,
					workflowName: original.name,
					outcome,
					summary: input.summary,
					createdAt: result.createdAt.toISOString(),
					updatedAt: result.updatedAt.toISOString(),
					completedAt: result.completedAt.toISOString(),
				},
			]);
			expect(await service.countForInbox(user)).toEqual({ [state]: 1, [otherState]: 0 });
			expect(await service.listForInbox(user, { state: otherState, limit: 10 })).toEqual([]);
		},
	);

	it('filters inaccessible rows before the limit and counts', async () => {
		const visible = await fixture();
		const hidden = await fixture();
		await results.update(visible.result.id, { updatedAt: new Date('2026-10-01T00:00:00Z') });
		await results.update(hidden.result.id, { updatedAt: new Date('2026-10-02T00:00:00Z') });

		const rows = await service.listForInbox(visible.user, { state: 'open', limit: 1 });
		expect(rows.map((row) => row.id)).toEqual([visible.result.id]);
		expect(await service.countForInbox(visible.user)).toEqual({ open: 1, closed: 0 });
	});

	it('uses current roles when a globally readable user does not have update access', async () => {
		const { result, original, project } = await fixture('needs_you', false, {
			inTeamProject: true,
		});
		const reviewer = await createUser({ role: GLOBAL_OWNER_ROLE });
		await addReviewer(result.configurationId, reviewer.id);
		await linkUserToProject(reviewer, project, 'project:viewer');
		expect(await service.countForInbox(reviewer)).toEqual({ open: 1, closed: 0 });
		const readOnlyRole = await createCustomRoleWithScopeSlugs(['workflow:read'], {
			roleType: 'global',
		});
		await Container.get(UserRepository).update(reviewer.id, { role: readOnlyRole });

		expect(await service.listForInbox(reviewer, { state: 'open', limit: 10 })).toEqual([]);
		expect(await service.countForInbox(reviewer)).toEqual({ open: 0, closed: 0 });
		await expect(service.getDetail(reviewer, project.id, original.id, result.id)).rejects.toThrow();
	});

	it('includes direct workflow shares for project members and removes revoked shares', async () => {
		const { result, original, project } = await fixture('needs_you', false, {
			inTeamProject: true,
		});
		const editor = await createUser();
		await addReviewer(result.configurationId, editor.id);
		await linkUserToProject(editor, project, 'project:viewer');
		await shareWorkflowWithUsers(original, [editor]);
		expect(await service.listForInbox(editor, { state: 'open', limit: 10 })).toEqual([
			expect.objectContaining({ id: result.id }),
		]);
		expect(await service.countForInbox(editor)).toEqual({ open: 1, closed: 0 });
		await expect(
			service.getDetail(editor, project.id, original.id, result.id),
		).resolves.toBeDefined();

		const personal = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			editor.id,
		);
		await Container.get(SharedWorkflowRepository).delete({
			workflowId: original.id,
			projectId: personal.id,
		});
		expect(await service.listForInbox(editor, { state: 'open', limit: 10 })).toEqual([]);
		expect(await service.countForInbox(editor)).toEqual({ open: 0, closed: 0 });
	});

	it('uses custom project scopes and requires both read and update', async () => {
		const { result, project } = await fixture('needs_you', false, { inTeamProject: true });
		const editor = await createUser();
		await addReviewer(result.configurationId, editor.id);
		const customEditor = await createCustomRoleWithScopeSlugs(['workflow:read', 'workflow:update']);
		const customViewer = await createCustomRoleWithScopeSlugs(['workflow:read']);
		await linkUserToProject(editor, project, customEditor.slug);
		expect(await service.countForInbox(editor)).toEqual({ open: 1, closed: 0 });
		expect(await service.listForInbox(editor, { state: 'open', limit: 10 })).toEqual([
			expect.objectContaining({ id: result.id }),
		]);
		await linkUserToProject(editor, project, customViewer.slug);
		expect(await service.listForInbox(editor, { state: 'open', limit: 10 })).toEqual([]);
		expect(await service.countForInbox(editor)).toEqual({ open: 0, closed: 0 });
	});

	it('hides results after the workflow moves out of the saved project', async () => {
		const { user, project, original } = await fixture();
		const destination = await createTeamProject(undefined, user);
		await Container.get(SharedWorkflowRepository).update(
			{ workflowId: original.id, projectId: project.id },
			{ projectId: destination.id },
		);
		expect(await service.listForInbox(user, { state: 'open', limit: 10 })).toEqual([]);
		expect(await service.countForInbox(user)).toEqual({ open: 0, closed: 0 });
	});

	it('rejects a disabled user before listing or counting', async () => {
		const { user } = await fixture();
		await Container.get(UserRepository).update(user.id, { disabled: true });
		await expect(service.listForInbox(user, { state: 'open', limit: 10 })).rejects.toThrow();
		await expect(service.countForInbox(user)).rejects.toThrow();
	});

	it.each(['dismissed', 'applied', 'discarded', 'outdated'] as const)(
		'derives Closed from the existing %s state',
		async (state) => {
			const { user, project, original, result } = await fixture(
				state === 'dismissed' ? 'needs_you' : 'fix_ready',
				state !== 'dismissed',
			);
			if (state === 'dismissed') await service.dismiss(user, project.id, original.id, result.id);
			else if (state === 'applied')
				await actions.apply(user, project.id, original.id, result.suggestionId!);
			else if (state === 'discarded')
				await actions.discard(user, project.id, original.id, result.suggestionId!);
			else {
				await workflows.update(original.id, { settings: { executionTimeout: 90 } });
				await suggestionService.reconcileWorkflow(original.id);
			}
			expect(await service.listForInbox(user, { state: 'open', limit: 10 })).toEqual([]);
			expect(await service.listForInbox(user, { state: 'closed', limit: 10 })).toEqual([
				expect.objectContaining({ id: result.id, state: 'closed' }),
			]);
			expect(await service.countForInbox(user)).toEqual({ open: 0, closed: 1 });
		},
	);

	describe('project member reviewers', () => {
		async function useProjectMembersOnly(configurationId: number) {
			await Container.get(DataSource)
				.getRepository(SelfHealingConfigurationReviewer)
				.delete({ configurationId });
			await Container.get(SelfHealingConfigurationRepository).update(configurationId, {
				includeAllProjectMembers: true,
			});
		}

		async function teamFixture(outcome: Outcome = 'fix_ready', withSuggestion = true) {
			const data = await fixture(outcome, withSuggestion, { inTeamProject: true });
			await useProjectMembersOnly(data.result.configurationId);
			return data;
		}

		async function expectReviewer(user: User, visible: boolean) {
			expect(await service.countForInbox(user)).toEqual({ open: visible ? 1 : 0, closed: 0 });
			expect(await service.listForInbox(user, { state: 'open', limit: 10 })).toHaveLength(
				visible ? 1 : 0,
			);
		}

		it('follows current membership for inbox rows, details, and actions', async () => {
			testServer.license.enable('feat:sharing');
			const { user, project, original, result } = await teamFixture();
			const member = await createUser();
			await shareWorkflowWithUsers(original, [member]);
			await expectReviewer(member, false);
			await expect(service.getDetail(member, project.id, original.id, result.id)).rejects.toThrow(
				NotFoundError,
			);

			await linkUserToProject(member, project, 'project:editor');
			await expectReviewer(member, true);
			await expectReviewer(user, true);
			await expect(
				service.getDetail(member, project.id, original.id, result.id),
			).resolves.toMatchObject({ resultId: result.id, reviewState: 'open' });

			await Container.get(ProjectRelationRepository).delete({
				userId: member.id,
				projectId: project.id,
			});
			await expectReviewer(member, false);
			await expect(
				service.act(member, project.id, original.id, result.id, 'apply'),
			).rejects.toThrow(NotFoundError);

			await linkUserToProject(member, project, 'project:editor');
			await expect(
				service.act(member, project.id, original.id, result.id, 'apply'),
			).resolves.toMatchObject({ reviewState: 'applied' });
		});

		it('keeps workflow edit access and enabled-user checks for members', async () => {
			const { project, original, result } = await teamFixture('needs_you', false);
			const viewer = await createUser();
			await linkUserToProject(viewer, project, 'project:viewer');
			await expectReviewer(viewer, false);
			await expect(service.getDetail(viewer, project.id, original.id, result.id)).rejects.toThrow();

			const disabled = await createUser();
			await linkUserToProject(disabled, project, 'project:editor');
			await Container.get(UserRepository).update(disabled.id, { disabled: true });
			await expect(service.countForInbox(disabled)).rejects.toThrow();
			await expect(service.dismiss(disabled, project.id, original.id, result.id)).rejects.toThrow();

			const adminMember = await createUser({ role: GLOBAL_OWNER_ROLE });
			await linkUserToProject(adminMember, project, 'project:viewer');
			await expectReviewer(adminMember, true);
			await expect(
				service.dismiss(adminMember, project.id, original.id, result.id),
			).resolves.toMatchObject({ reviewState: 'dismissed' });
		});

		it('keeps a member who edits the workflow through a share after a role downgrade', async () => {
			testServer.license.enable('feat:sharing');
			await disableInstanceAdmins();
			const prepared = await prepareInvestigation('needs_you', false, { inTeamProject: true });
			const { user, project, original, investigation } = prepared;
			// A global role gives the enabler access without project membership, so only the
			// shared member keeps the project group eligible.
			const enablerRole = await createCustomRoleWithScopeSlugs(
				['workflow:read', 'workflow:update', 'execution:read'],
				{ roleType: 'global' },
			);
			const enabler = await createUser({ role: enablerRole });
			await useProjectMembersOnly(investigation.configurationId);
			await Container.get(SelfHealingConfigurationRepository).update(
				investigation.configurationId,
				{
					enabledById: enabler.id,
				},
			);
			await linkUserToProject(user, project, 'project:viewer');
			await shareWorkflowWithUsers(original, [user]);

			const result = await completeResult({
				investigationId: investigation.id,
				...prepared.completion,
			});
			expect(
				await Container.get(SelfHealingConfigurationRepository).findOneBy({
					id: investigation.configurationId,
				}),
			).toMatchObject({ enabled: true, enabledById: enabler.id });
			await expectReviewer(user, true);
			await expect(
				service.dismiss(user, project.id, original.id, result.id),
			).resolves.toMatchObject({ reviewState: 'dismissed' });
		});

		it.each([GLOBAL_OWNER_ROLE, GLOBAL_ADMIN_ROLE])(
			'includes $slug outside the project and excludes other-project members',
			async (role) => {
				const { project, original, result } = await teamFixture();
				const admin = await createUser({ role });
				const outsider = await createUser();
				const otherProject = await createTeamProject(undefined, outsider);
				await linkUserToProject(outsider, otherProject, 'project:editor');
				await Container.get(SharedWorkflowRepository).save({
					workflowId: original.id,
					projectId: otherProject.id,
					role: 'workflow:editor',
				});

				await expectReviewer(outsider, false);
				await expect(
					service.getDetail(outsider, project.id, original.id, result.id),
				).rejects.toThrow(NotFoundError);
				await expectReviewer(admin, true);
				await expect(
					service.getDetail(admin, project.id, original.id, result.id),
				).resolves.toMatchObject({ resultId: result.id });

				await Container.get(SelfHealingConfigurationRepository).update(result.configurationId, {
					includeAllProjectMembers: false,
				});
				await expectReviewer(admin, false);
				await expect(
					service.act(admin, project.id, original.id, result.id, 'apply'),
				).rejects.toThrow(NotFoundError);

				await addReviewer(result.configurationId, admin.id);
				await expectReviewer(admin, true);
				await Container.get(UserRepository).update(admin.id, { role: GLOBAL_MEMBER_ROLE });
				await expectReviewer(admin, false);
			},
		);

		it('shows personal project results only to the project owner', async () => {
			const { user, project, original, result } = await fixture();
			await useProjectMembersOnly(result.configurationId);
			const admin = await createUser({ role: GLOBAL_OWNER_ROLE });
			await addReviewer(result.configurationId, admin.id);

			await expectReviewer(user, true);
			await expectReviewer(admin, false);
			await expect(service.getDetail(admin, project.id, original.id, result.id)).rejects.toThrow(
				NotFoundError,
			);
			await expect(service.dismiss(admin, project.id, original.id, result.id)).rejects.toThrow(
				NotFoundError,
			);
			await expect(
				service.dismiss(user, project.id, original.id, result.id),
			).resolves.toMatchObject({ reviewState: 'dismissed' });
		});

		it('lists a member who is also selected individually once before pagination', async () => {
			const prepared = await teamFixture('needs_you', false);
			const { user, result } = prepared;
			await addReviewer(result.configurationId, user.id);
			const second = await addResult(prepared);
			const updatedAt = new Date('2026-10-05T00:00:00Z');
			await results.update(result.id, { updatedAt });
			await results.update(second.id, { updatedAt: new Date('2026-10-04T00:00:00Z') });

			expect(await service.countForInbox(user)).toEqual({ open: 2, closed: 0 });
			expect(await service.listForInbox(user, { state: 'open', limit: 1 })).toMatchObject([
				{ id: result.id },
			]);
			expect(
				await service.listForInbox(user, {
					state: 'open',
					limit: 1,
					boundary: { mode: 'afterItem', updatedAt, id: result.id },
				}),
			).toMatchObject([{ id: second.id }]);
			expect(await service.listForInbox(user, { state: 'open', limit: 10 })).toHaveLength(2);
		});

		it('ignores members when the configuration lists individual reviewers only', async () => {
			const { project, original, result } = await teamFixture();
			const member = await createUser();
			await linkUserToProject(member, project, 'project:editor');
			await Container.get(SelfHealingConfigurationRepository).update(result.configurationId, {
				includeAllProjectMembers: false,
			});
			await expectReviewer(member, false);
			await expect(service.getDetail(member, project.id, original.id, result.id)).rejects.toThrow(
				NotFoundError,
			);
		});
	});

	it('revokes review access when an editor selected individually leaves the project', async () => {
		testServer.license.enable('feat:sharing');
		const { project, original, result } = await fixture('fix_ready', true, {
			inTeamProject: true,
		});
		const reviewer = await createUser();
		await addReviewer(result.configurationId, reviewer.id);
		await linkUserToProject(reviewer, project, 'project:editor');
		await shareWorkflowWithUsers(original, [reviewer]);
		expect(await service.countForInbox(reviewer)).toEqual({ open: 1, closed: 0 });

		await Container.get(ProjectRelationRepository).delete({
			userId: reviewer.id,
			projectId: project.id,
		});
		expect(await service.countForInbox(reviewer)).toEqual({ open: 0, closed: 0 });
		expect(await service.listForInbox(reviewer, { state: 'open', limit: 10 })).toEqual([]);
		await expect(service.getDetail(reviewer, project.id, original.id, result.id)).rejects.toThrow(
			NotFoundError,
		);
		await expect(
			service.act(reviewer, project.id, original.id, result.id, 'apply'),
		).rejects.toThrow(NotFoundError);
	});

	it('paginates by latest update even when a result was created earlier', async () => {
		const prepared = await fixture();
		const { user, result } = prepared;
		const second = await addResult(prepared);
		const updatedAt = new Date('2026-10-03T00:00:00Z');
		await results.update(result.id, {
			createdAt: new Date('2026-10-01T00:00:00Z'),
			updatedAt,
		});
		await results.update(second.id, {
			createdAt: new Date('2026-10-02T00:00:00Z'),
			updatedAt: new Date('2026-10-02T00:00:00Z'),
		});
		expect(await service.listForInbox(user, { state: 'open', limit: 1 })).toMatchObject([
			{ id: result.id },
		]);
		expect(
			await service.listForInbox(user, {
				state: 'open',
				limit: 1,
				boundary: { mode: 'afterItem', updatedAt, id: result.id },
			}),
		).toMatchObject([{ id: second.id }]);
	});

	it('applies all shared boundary modes to tied result timestamps', async () => {
		const prepared = await fixture();
		const { user, result } = prepared;
		const second = await addResult(prepared);
		const third = await addResult(prepared);
		const updatedAt = new Date('2026-10-07T00:00:00.000Z');
		for (const row of [result, second, third]) await results.update(row.id, { updatedAt });
		const all = await service.listForInbox(user, { state: 'open', limit: 10 });
		const boundary = { updatedAt, id: all[0].id };

		expect(
			await service.listForInbox(user, {
				state: 'open',
				limit: 10,
				boundary: { mode: 'beforeTime', updatedAt },
			}),
		).toEqual([]);
		expect(
			await service.listForInbox(user, {
				state: 'open',
				limit: 10,
				boundary: { mode: 'beforeOrAtTime', updatedAt },
			}),
		).toEqual(all);
		expect(
			await service.listForInbox(user, {
				state: 'open',
				limit: 10,
				boundary: { mode: 'afterItem', ...boundary },
			}),
		).toEqual(all.slice(1));
		await results.delete(boundary.id);
		expect(
			await service.listForInbox(user, {
				state: 'open',
				limit: 10,
				boundary: { mode: 'afterItem', ...boundary },
			}),
		).toEqual(all.slice(1));
	});
});

describe('configuration lifecycle', () => {
	it('pauses admission without reviewers and preserves the report for a replacement reviewer', async () => {
		const { user, project, original, input, result } = await fixture('could_not_fix', false, {
			inTeamProject: true,
		});
		const configurations = Container.get(SelfHealingConfigurationService);
		const reviewer = await createUser();
		await linkUserToProject(reviewer, project, 'project:editor');
		await configurations.save(
			user,
			project.id,
			{
				scope: 'all',
				workflowIds: [],
				reviewerIds: [reviewer.id],
				includeAllProjectMembers: false,
			},
			result.configurationId,
		);
		await Container.get(UserRepository).delete(reviewer.id);
		const nextExecution = await createExecution(
			{ status: 'error', mode: 'trigger', workflowVersionId: original.versionId },
			original,
		);
		const producer = Container.get(SelfHealingInvestigationService);
		const failure = { ...input, executionId: nextExecution.id };
		vi.spyOn(Date, 'now').mockReturnValue(
			result.completedAt.getTime() + SELF_HEALING_CANNOT_FIX_COOLDOWN_MS + 1,
		);

		expect(await producer.start(failure)).toBeNull();
		expect(runtime.startSelfHealingRun).not.toHaveBeenCalled();
		expect(await configurations.get(project.id, result.configurationId)).toMatchObject({
			enabled: false,
			enabledById: user.id,
			reviewerIds: [],
		});
		expect(await results.findOneBy({ id: result.id })).not.toBeNull();

		await configurations.save(
			user,
			project.id,
			{
				scope: 'all',
				workflowIds: [],
				reviewerIds: [user.id],
				includeAllProjectMembers: false,
			},
			result.configurationId,
		);
		expect(await service.getDetail(user, project.id, original.id, result.id)).toMatchObject({
			resultId: result.id,
		});
		await configurations.setEnabled(user, project.id, result.configurationId, true);
		expect(await producer.start(failure)).toMatchObject({ kind: 'investigation' });
		expect(runtime.startSelfHealingRun).toHaveBeenCalledTimes(1);
	});

	it('pauses when the sole reviewer is deleted between admission and claim', async () => {
		const { user, project, original, input } = await prepareFixture('needs_you', {}, true);
		const configurations = Container.get(SelfHealingConfigurationService);
		const reviewer = await createUser();
		await linkUserToProject(reviewer, project, 'project:editor');
		await configurations.save(
			user,
			project.id,
			{
				scope: 'all',
				workflowIds: [],
				reviewerIds: [reviewer.id],
				includeAllProjectMembers: false,
			},
			input.configurationId,
		);
		const references = Container.get(SelfHealingExecutionReferenceService);
		const validateFailure = references.validateFailure.bind(references);
		vi.spyOn(references, 'validateFailure').mockImplementationOnce(async (...args) => {
			await validateFailure(...args);
			await Container.get(UserRepository).delete(reviewer.id);
		});

		expect(await Container.get(SelfHealingInvestigationService).start(input)).toBeNull();
		expect(runtime.startSelfHealingRun).not.toHaveBeenCalled();
		expect(await investigations.getForExecution(original.id, input.executionId)).toBeNull();
		expect(await configurations.get(project.id, input.configurationId)).toMatchObject({
			enabled: false,
			enabledById: user.id,
		});
	});

	it.each([false, true])(
		'finishes without a result after reviewer deletion with suggestion=%s',
		async (withSuggestion) => {
			const { user, project, original, investigation, completion } = await prepareInvestigation(
				withSuggestion ? 'fix_ready' : 'could_not_fix',
				withSuggestion,
				{ inTeamProject: true },
			);
			const configurations = Container.get(SelfHealingConfigurationService);
			const reviewer = await createUser();
			await linkUserToProject(reviewer, project, 'project:editor');
			await configurations.save(
				user,
				project.id,
				{
					scope: 'all',
					workflowIds: [],
					reviewerIds: [reviewer.id],
					includeAllProjectMembers: false,
				},
				investigation.configurationId,
			);
			if (withSuggestion) {
				const prepare = suggestionService.prepareSuggestion.bind(suggestionService);
				vi.spyOn(suggestionService, 'prepareSuggestion').mockImplementationOnce(async (...args) => {
					const prepared = await prepare(...args);
					await Container.get(UserRepository).delete(reviewer.id);
					return prepared;
				});
			} else {
				await Container.get(UserRepository).delete(reviewer.id);
			}

			expect(
				await service.complete({ investigationId: investigation.id, ...completion }),
			).toBeNull();
			expect(await investigations.findInvestigation(investigation.id)).toMatchObject({
				finishedAt: expect.any(Date),
				resultId: null,
			});
			expect(await investigations.getUnfinishedForWorkflow(original.id)).toBeNull();
			expect(await results.count()).toBe(0);
			expect(await suggestions.getPendingForWorkflow(original.id)).toBeNull();
			expect(await configurations.get(project.id, investigation.configurationId)).toMatchObject({
				enabled: false,
				enabledById: user.id,
				reviewerIds: [],
			});
		},
	);

	it('keeps the source configuration enabled when a workflow moves during a run', async () => {
		const { input, user, project, original } = await prepareFixture('could_not_fix');
		const releaseRun = createDeferredPromise();
		const destinationUser = await createUser();
		const destination = await createTeamProject(undefined, destinationUser);
		runtime.startSelfHealingRun.mockImplementation(async (_input, lifecycle) => {
			await releaseRun.promise;
			const run: SelfHealingRunResult = {
				threadId: lifecycle.threadId,
				runId: lifecycle.runId,
				status: 'completed',
				finishReason: 'stop',
				output: {
					outcome: 'could_not_fix',
					summary: 'No fix found.',
					report: 'No fix found.',
					candidateFilePath: null,
				},
				usage: { credits: null, turns: null, durationSeconds: null },
			};
			await lifecycle.onComplete(run, new AbortController().signal);
			return run;
		});
		const started = await Container.get(SelfHealingInvestigationService).start(input);
		if (started?.kind !== 'investigation') throw new Error('Expected an investigation.');
		const shares = Container.get(SharedWorkflowRepository);
		await shares.delete({ workflowId: original.id });
		await shares.save({
			workflowId: original.id,
			projectId: destination.id,
			role: 'workflow:owner',
		});
		releaseRun.resolve();
		await vi.waitFor(async () => {
			expect(
				(await investigations.findInvestigation(started.investigationId))?.finishedAt,
			).toBeInstanceOf(Date);
		});
		expect(await results.count()).toBe(0);
		expect(
			await Container.get(SelfHealingConfigurationService).get(project.id, input.configurationId),
		).toMatchObject({ enabled: true, enabledById: user.id });
	});

	it('can accept late output after re-enabling if cancellation misses the run', async () => {
		const { user, project, original, investigation, completion } = await prepareInvestigation();
		const configurations = Container.get(SelfHealingConfigurationService);
		await configurations.setEnabled(user, project.id, investigation.configurationId, false);
		expect(await investigations.getUnfinishedForWorkflow(original.id)).not.toBeNull();
		await configurations.setEnabled(user, project.id, investigation.configurationId, true);
		expect(
			await service.complete({ investigationId: investigation.id, ...completion }),
		).toMatchObject({ configurationId: investigation.configurationId });
		expect(await investigations.getUnfinishedForWorkflow(original.id)).toBeNull();
		expect(await suggestions.getPendingForWorkflow(original.id)).not.toBeNull();
		expect(await results.count()).toBe(1);
	});

	it('rejects canceled output after re-enabling the configuration', async () => {
		const { user, project, original, investigation, completion } = await prepareInvestigation();
		const configurations = Container.get(SelfHealingConfigurationService);
		const abort = new AbortController();
		runtime.routeCancelRun.mockImplementationOnce(async () => abort.abort());

		await configurations.setEnabled(user, project.id, investigation.configurationId, false);
		await configurations.setEnabled(user, project.id, investigation.configurationId, true);

		expect(runtime.routeCancelRun).toHaveBeenCalledExactlyOnceWith(investigation.threadId);
		await expect(
			service.complete({
				investigationId: investigation.id,
				...completion,
				signal: abort.signal,
			}),
		).rejects.toThrow();
		expect(runtime.startSelfHealingRun).not.toHaveBeenCalled();
		expect(await suggestions.getPendingForWorkflow(original.id)).toBeNull();
		expect(await results.count()).toBe(0);
	});

	it.each(['pause', 'remove'] as const)(
		'checks %s again after output preparation and before saving a suggestion',
		async (action) => {
			const { user, project, original, investigation, completion } = await prepareInvestigation();
			const ready = createDeferredPromise();
			const resume = createDeferredPromise();
			const prepare = suggestionService.prepareSuggestion.bind(suggestionService);
			vi.spyOn(suggestionService, 'prepareSuggestion').mockImplementationOnce(async (...args) => {
				const prepared = await prepare(...args);
				ready.resolve();
				await resume.promise;
				return prepared;
			});
			const completing = service.complete({ investigationId: investigation.id, ...completion });
			await ready.promise;
			const configurations = Container.get(SelfHealingConfigurationService);
			if (action === 'pause') {
				await configurations.setEnabled(user, project.id, investigation.configurationId, false);
			} else {
				await configurations.remove(project.id, investigation.configurationId);
			}
			resume.resolve();
			expect(await completing).toBeNull();
			expect(await suggestions.getPendingForWorkflow(original.id)).toBeNull();
			expect(await results.count()).toBe(0);
		},
	);

	it('deletes unfinished investigations and ignores late output', async () => {
		const { project, original, investigation, completion } = await prepareInvestigation();
		await Container.get(SelfHealingConfigurationService).remove(
			project.id,
			investigation.configurationId,
		);
		expect(await investigations.findInvestigation(investigation.id)).toBeNull();
		expect(runtime.routeCancelRun).toHaveBeenCalledExactlyOnceWith(investigation.threadId);
		expect(await service.complete({ investigationId: investigation.id, ...completion })).toBeNull();
		expect(await investigations.getUnfinishedForWorkflow(original.id)).toBeNull();
		expect(await suggestions.getPendingForWorkflow(original.id)).toBeNull();
	});

	it('keeps paused reviews visible and removes linked suggestions with the configuration', async () => {
		const { user, project, original, result, url } = await fixture('fix_ready', true);
		const configurations = Container.get(SelfHealingConfigurationService);
		await configurations.setEnabled(user, project.id, result.configurationId, false);
		expect(await service.countForInbox(user)).toEqual({ open: 1, closed: 0 });
		await testServer.authAgentFor(user).get(url).expect(200);
		await configurations.remove(project.id, result.configurationId);
		expect(await results.findOneBy({ id: result.id })).toBeNull();
		expect(await suggestions.getPendingForWorkflow(original.id)).toBeNull();
		expect(await suggestions.findOneBy({ id: result.suggestionId! })).toBeNull();
		expect(await suggestions.getActivity(result.suggestionId!)).toEqual([]);
		expect(await service.countForInbox(user)).toEqual({ open: 0, closed: 0 });
		expect(await service.listForInbox(user, { state: 'open', limit: 10 })).toEqual([]);
		await testServer.authAgentFor(user).get(url).expect(404);
		await testServer.authAgentFor(user).post(`${url}/apply`).expect(404);
		expect(runtime.routeCancelRun).not.toHaveBeenCalled();
	});

	it('keeps independent suggestions when their result is deleted', async () => {
		const { result } = await fixture('fix_ready', true);

		await results.delete(result.id);

		expect(await suggestions.findOneBy({ id: result.suggestionId! })).not.toBeNull();
		expect(await suggestions.getActivity(result.suggestionId!)).toHaveLength(1);
	});

	it('deletes the referencing result when its suggestion is deleted', async () => {
		const { result } = await fixture('fix_ready', true);

		await suggestions.delete(result.suggestionId!);

		expect(await results.findOneBy({ id: result.id })).toBeNull();
		expect(await suggestions.getActivity(result.suggestionId!)).toEqual([]);
	});

	it('removes only the suggestions linked to the removed configuration', async () => {
		const first = await fixture('fix_ready', true);
		const second = await fixture('fix_ready', true);
		const standalone = await fixture('fix_ready', true);
		await results.delete(standalone.result.id);

		await Container.get(SelfHealingConfigurationService).remove(
			first.project.id,
			first.result.configurationId,
		);

		expect(await results.findOneBy({ id: first.result.id })).toBeNull();
		expect(await suggestions.findOneBy({ id: first.result.suggestionId! })).toBeNull();
		expect(await results.findOneBy({ id: second.result.id })).not.toBeNull();
		expect(await suggestions.findOneBy({ id: second.result.suggestionId! })).not.toBeNull();
		expect(await suggestions.findOneBy({ id: standalone.result.suggestionId! })).not.toBeNull();
	});

	it('rolls back suggestion cleanup if configuration deletion fails', async () => {
		const { result } = await fixture('fix_ready', true);
		await expect(
			Container.get(TransactionRunner).run({}, async (ctx) => {
				await Container.get(SelfHealingConfigurationRepository).deleteConfiguration(
					result.configurationId,
					ctx,
				);
				throw new Error('Deletion failed.');
			}),
		).rejects.toThrow('Deletion failed.');

		expect(await results.findOneBy({ id: result.id })).not.toBeNull();
		expect(await suggestions.findOneBy({ id: result.suggestionId! })).not.toBeNull();
		expect(await suggestions.getActivity(result.suggestionId!)).toHaveLength(1);
	});

	it('preserves applied workflow changes when the configuration is removed', async () => {
		const { user, project, original, result } = await fixture('fix_ready', true);
		await service.act(user, project.id, original.id, result.id, 'apply');
		const applied = await workflows.findOneByOrFail({ id: original.id });
		await Container.get(SelfHealingConfigurationService).remove(project.id, result.configurationId);
		expect(await results.findOneBy({ id: result.id })).toBeNull();
		expect(await suggestions.findOneBy({ id: result.suggestionId! })).toBeNull();
		expect(await workflows.findOneByOrFail({ id: original.id })).toMatchObject({
			versionId: applied.versionId,
			nodes: applied.nodes,
			connections: applied.connections,
		});
	});

	it('filters unassigned reviewers and applies reviewer changes to existing results', async () => {
		const { result, project, url } = await fixture('fix_ready', true, { inTeamProject: true });
		const editor = await createUser();
		await linkUserToProject(editor, project, 'project:editor');
		const agent = testServer.authAgentFor(editor);
		expect(await service.countForInbox(editor)).toEqual({ open: 0, closed: 0 });
		await agent.get(url).expect(404);
		await agent.post(`${url}/apply`).expect(404);
		await addReviewer(result.configurationId, editor.id);
		expect(await service.countForInbox(editor)).toEqual({ open: 1, closed: 0 });
		await agent.get(url).expect(200);
		await Container.get(DataSource)
			.getRepository(SelfHealingConfigurationReviewer)
			.delete({ configurationId: result.configurationId, userId: editor.id });
		expect(await service.countForInbox(editor)).toEqual({ open: 0, closed: 0 });
		await agent.post(`${url}/dismiss`).expect(404);
	});

	it('does not let an old actor disable a later explicit enablement', async () => {
		const { user, project, original, investigation } = await prepareInvestigation(
			'fix_ready',
			true,
			{
				inTeamProject: true,
			},
		);
		const configurations = Container.get(SelfHealingConfigurationService);
		await configurations.setEnabled(user, project.id, investigation.configurationId, false);
		const replacement = await createUser({ role: GLOBAL_OWNER_ROLE });
		await linkUserToProject(replacement, project, 'project:viewer');
		await addReviewer(investigation.configurationId, replacement.id);
		await configurations.setEnabled(replacement, project.id, investigation.configurationId, true);
		await Container.get(UserRepository).update(user.id, { disabled: true });
		await configurations.recheckAccess(investigation.configurationId, project.id, original.id);
		expect(
			await Container.get(SelfHealingConfigurationRepository).findOneByOrFail({
				id: investigation.configurationId,
			}),
		).toMatchObject({ enabled: true, enabledById: replacement.id });
	});
});
