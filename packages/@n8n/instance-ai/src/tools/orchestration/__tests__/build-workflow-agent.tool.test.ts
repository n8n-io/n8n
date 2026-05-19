import type { BuiltTool } from '@n8n/agents';
import {
	applyBranchReadOnlyOverrides,
	DEFAULT_INSTANCE_AI_PERMISSIONS,
	type InstanceAiPermissions,
} from '@n8n/api-types';
import { UserError } from 'n8n-workflow';

import { executeTool } from '../../../__tests__/tool-test-utils';
import type { BuilderSandboxSession } from '../../../runtime/builder-sandbox-session-registry';
import { createToolRegistry } from '../../../tool-registry';
import type { OrchestrationContext, InstanceAiContext } from '../../../types';
import { createRemediation } from '../../../workflow-loop';
import type { WorkflowBuildOutcome, WorkflowLoopState } from '../../../workflow-loop';
import type {
	SubmitWorkflowAttempt,
	SubmitWorkflowOutput,
} from '../../workflows/submit-workflow.tool';

const {
	recordSuccessfulWorkflowBuilds,
	resultFromPostStreamError,
	resultFromTerminalRemediation,
	resultFromLaterFailedMainSubmit,
	attemptFromAutoResubmit,
	withTerminalLoopState,
	finalizeBuildResult,
	shouldRecoverSavedWorkflowAfterFailedSubmit,
	createBuildWorkflowAgentTool,
	buildWarmBuilderFollowUp,
	createMainWorkflowSnapshot,
	determineSetupRequirement,
	determineVerificationReadiness,
	getBuilderSessionMemory,
	mergeLatestVerificationIntoOutcome,
	settleMissingMainWorkflowSubmit,
	supportingWorkflowIdsFromSubmitAttempts,
} =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../build-workflow-agent.tool') as typeof import('../build-workflow-agent.tool');

function mockBuiltTool(name: string): BuiltTool {
	return { name, description: name, handler: jest.fn() };
}

function mockToolRegistry(
	tools: Record<string, BuiltTool> = {},
): OrchestrationContext['domainTools'] {
	return createToolRegistry(Object.entries(tools));
}

function createMockContext(overrides: Partial<OrchestrationContext> = {}): OrchestrationContext {
	return {
		threadId: 'test-thread',
		runId: 'test-run',
		userId: 'test-user',
		orchestratorAgentId: 'test-agent',
		modelId: 'test-model' as OrchestrationContext['modelId'],
		subAgentMaxSteps: 5,
		eventBus: {
			publish: jest.fn(),
			subscribe: jest.fn(),
			getEventsAfter: jest.fn(),
			getNextEventId: jest.fn(),
			getEventsForRun: jest.fn().mockReturnValue([]),
			getEventsForRuns: jest.fn().mockReturnValue([]),
		},
		logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
		domainTools: mockToolRegistry(),
		abortSignal: new AbortController().signal,
		...overrides,
	} as OrchestrationContext;
}

function createMockDomainContext(
	permissionOverrides: Partial<InstanceAiPermissions> = {},
	workflowName = 'Existing Workflow',
): InstanceAiContext {
	return {
		userId: 'test-user',
		permissions: { ...DEFAULT_INSTANCE_AI_PERMISSIONS, ...permissionOverrides },
		workflowService: {
			get: jest.fn().mockResolvedValue({ name: workflowName }),
		} as unknown as InstanceAiContext['workflowService'],
		executionService: {} as InstanceAiContext['executionService'],
		credentialService: {} as InstanceAiContext['credentialService'],
		nodeService: {} as InstanceAiContext['nodeService'],
		dataTableService: {} as InstanceAiContext['dataTableService'],
	};
}

function createSpawnableContext(
	permissionOverrides: Partial<InstanceAiPermissions> = {},
	overrides: Partial<OrchestrationContext> = {},
): OrchestrationContext {
	return createMockContext({
		domainContext: createMockDomainContext(permissionOverrides),
		domainTools: mockToolRegistry({ 'build-workflow': mockBuiltTool('build-workflow') }),
		spawnBackgroundTask: jest.fn().mockReturnValue({
			status: 'started',
			taskId: 'build-task',
			agentId: 'agent-builder',
		}),
		...overrides,
	});
}

const MAIN_PATH = '/home/daytona/workspace/src/workflow.ts';

describe('buildWarmBuilderFollowUp', () => {
	it('keeps the detached builder verification contract in warm follow-ups', () => {
		const briefing = buildWarmBuilderFollowUp({
			task: 'Change the Gmail recipient',
			workflowId: 'workflow-1',
			workItemId: 'work-item-1',
		});

		expect(briefing).toContain('<builder-follow-up type="fix">');
		expect(briefing).toContain('Workflow ID: workflow-1');
		expect(briefing).toContain('Do NOT stop after a successful submit without verifying');
		expect(briefing).toContain('verify-built-workflow');
		expect(briefing).toContain('nodes(action="explore-resources")');
		expect(briefing).toContain('Do NOT call `workflows(action="publish")` for the main workflow');
		expect(briefing).toContain('<requested-change>');
		expect(briefing).toContain('Change the Gmail recipient');
	});
});

describe('getBuilderSessionMemory', () => {
	const session = { sessionId: 'builder-session-1' } as BuilderSandboxSession;

	it('uses memory for retained builder sessions', () => {
		const memory = {} as OrchestrationContext['memory'];

		expect(getBuilderSessionMemory({ memory }, session)).toBe(memory);
	});

	it('skips memory when there is no retained builder session', () => {
		const memory = {} as OrchestrationContext['memory'];

		expect(getBuilderSessionMemory({ memory }, undefined)).toBeUndefined();
	});

	it('skips memory when the context has no memory store', () => {
		expect(getBuilderSessionMemory({}, session)).toBeUndefined();
	});
});

describe('mergeLatestVerificationIntoOutcome', () => {
	const baseOutcome: WorkflowBuildOutcome = {
		workItemId: 'work-item-1',
		taskId: 'task-1',
		workflowId: 'workflow-1',
		submitted: true,
		triggerType: 'manual_or_testable',
		needsUserInput: false,
		summary: 'Submitted',
	};

	it('copies matching structured verification evidence into the returned outcome', () => {
		const result = mergeLatestVerificationIntoOutcome(baseOutcome, {
			...baseOutcome,
			verification: {
				attempted: true,
				success: true,
				executionId: 'exec-1',
				status: 'success',
				evidence: {
					nodesExecuted: ['Form Trigger', 'Send Email'],
					producedOutputRows: 2,
				},
				verifiedAt: '2026-04-30T12:00:00.000Z',
			},
		});

		expect(result.verification).toMatchObject({
			attempted: true,
			success: true,
			executionId: 'exec-1',
			evidence: {
				nodesExecuted: ['Form Trigger', 'Send Email'],
			},
		});
	});

	it('does not copy stale verification evidence from a different builder task', () => {
		const result = mergeLatestVerificationIntoOutcome(baseOutcome, {
			...baseOutcome,
			taskId: 'previous-task',
			verification: {
				attempted: true,
				success: true,
				executionId: 'exec-old',
				status: 'success',
			},
		});

		expect(result.verification).toBeUndefined();
	});
});

describe('determineVerificationReadiness', () => {
	it('marks a mockable trigger as ready without exposing pin-data details to the prompt', () => {
		expect(
			determineVerificationReadiness({
				submitted: true,
				workflowId: 'workflow-1',
				triggerNodes: [{ nodeName: 'Webhook', nodeType: 'n8n-nodes-base.webhook' }],
				mockedCredentialTypes: ['slackApi'],
				mockedCredentialsByNode: { Slack: ['slackApi'] },
				verificationPinData: { Slack: [{ _mockedCredential: 'slackApi' }] },
			}),
		).toEqual({ status: 'ready' });
	});

	it('accepts saved workflow pin data as verification support for mocked credentials', () => {
		expect(
			determineVerificationReadiness({
				submitted: true,
				workflowId: 'workflow-1',
				triggerNodes: [{ nodeName: 'Webhook', nodeType: 'n8n-nodes-base.webhook' }],
				mockedCredentialTypes: ['slackApi'],
				mockedCredentialsByNode: { Slack: ['slackApi'] },
				usesWorkflowPinDataForVerification: true,
			}),
		).toEqual({ status: 'ready' });
	});

	it('routes unresolved placeholders and unverifiable mocked credentials to setup', () => {
		expect(
			determineVerificationReadiness({
				submitted: true,
				workflowId: 'workflow-1',
				triggerNodes: [{ nodeName: 'Webhook', nodeType: 'n8n-nodes-base.webhook' }],
				hasUnresolvedPlaceholders: true,
			}),
		).toMatchObject({
			status: 'needs_setup',
			reason: 'unresolved-placeholders',
		});

		expect(
			determineVerificationReadiness({
				submitted: true,
				workflowId: 'workflow-1',
				triggerNodes: [{ nodeName: 'Webhook', nodeType: 'n8n-nodes-base.webhook' }],
				mockedCredentialTypes: ['slackApi'],
			}),
		).toMatchObject({
			status: 'needs_setup',
			reason: 'missing-mocked-credential-pin-data',
		});
	});

	it('marks successful structured verification as already verified', () => {
		expect(
			determineVerificationReadiness({
				submitted: true,
				workflowId: 'workflow-1',
				triggerNodes: [{ nodeName: 'Webhook', nodeType: 'n8n-nodes-base.webhook' }],
				verification: {
					attempted: true,
					success: true,
					executionId: 'exec-1',
					evidence: { nodesExecuted: ['Webhook', 'Slack'] },
				},
			}),
		).toEqual({ status: 'already_verified' });
	});

	it('marks non-mockable triggers as not verifiable by the post-build flow', () => {
		expect(
			determineVerificationReadiness({
				submitted: true,
				workflowId: 'workflow-1',
				triggerNodes: [{ nodeName: 'Github Trigger', nodeType: 'n8n-nodes-base.githubTrigger' }],
			}),
		).toMatchObject({
			status: 'not_verifiable',
			reason: 'non-mockable-trigger',
		});
	});
});

describe('determineSetupRequirement', () => {
	it('requires setup for mocked credentials even when verification can run', () => {
		expect(
			determineSetupRequirement({
				submitted: true,
				workflowId: 'workflow-1',
				triggerNodes: [{ nodeName: 'Webhook', nodeType: 'n8n-nodes-base.webhook' }],
				mockedCredentialTypes: ['slackApi'],
				mockedCredentialsByNode: { Slack: ['slackApi'] },
				verificationPinData: { Slack: [{ _mockedCredential: 'slackApi' }] },
			}),
		).toMatchObject({
			status: 'required',
			reason: 'mocked-credentials',
		});
	});

	it('does not require setup when credentials and placeholders are resolved', () => {
		expect(
			determineSetupRequirement({
				submitted: true,
				workflowId: 'workflow-1',
				triggerNodes: [{ nodeName: 'Webhook', nodeType: 'n8n-nodes-base.webhook' }],
			}),
		).toEqual({ status: 'not_required' });
	});
});

describe('resultFromPostStreamError', () => {
	it('preserves the submitted workflow when the stream errors after a successful submit', () => {
		const submitAttempts: SubmitWorkflowAttempt[] = [
			{
				filePath: '/home/daytona/workspace/chunks/fetch-weather.ts',
				sourceHash: 'sub',
				success: true,
				workflowId: 'SUB_123',
			},
			{
				filePath: MAIN_PATH,
				sourceHash: 'abc',
				success: true,
				workflowId: 'WF_123',
				referencedWorkflowIds: ['SUB_123'],
			},
		];

		const result = resultFromPostStreamError({
			error: new Error('Unauthorized'),
			submitAttempts,
			mainWorkflowPath: MAIN_PATH,
			workItemId: 'wi_test',
			runId: 'run_test',
			taskId: 'task_test',
		});

		expect(result).toBeDefined();
		expect(result!.outcome).toMatchObject({
			workItemId: 'wi_test',
			taskId: 'task_test',
			workflowId: 'WF_123',
			submitted: true,
			supportingWorkflowIds: ['SUB_123'],
		});
		expect(result!.text).toContain('Unauthorized');
	});

	it('returns undefined when no submit happened before the error', () => {
		const result = resultFromPostStreamError({
			error: new Error('Unauthorized'),
			submitAttempts: [],
			mainWorkflowPath: MAIN_PATH,
			workItemId: 'wi_test',
			runId: 'run_test',
			taskId: 'task_test',
		});

		expect(result).toBeUndefined();
	});

	it('returns undefined when the only submit attempt failed', () => {
		const submitAttempts: SubmitWorkflowAttempt[] = [
			{
				filePath: MAIN_PATH,
				sourceHash: 'abc',
				success: false,
				errors: ['validation failed'],
			},
		];

		const result = resultFromPostStreamError({
			error: new Error('Unauthorized'),
			submitAttempts,
			mainWorkflowPath: MAIN_PATH,
			workItemId: 'wi_test',
			runId: 'run_test',
			taskId: 'task_test',
		});

		expect(result).toBeUndefined();
	});

	it('returns undefined when only sub-workflows were submitted (not the main path)', () => {
		const submitAttempts: SubmitWorkflowAttempt[] = [
			{
				filePath: '/home/daytona/workspace/src/subworkflow.ts',
				sourceHash: 'abc',
				success: true,
				workflowId: 'SUB_123',
			},
		];

		const result = resultFromPostStreamError({
			error: new Error('Unauthorized'),
			submitAttempts,
			mainWorkflowPath: MAIN_PATH,
			workItemId: 'wi_test',
			runId: 'run_test',
			taskId: 'task_test',
		});

		expect(result).toBeUndefined();
	});

	it('does not preserve an earlier main-path submit when a later submit failed with code-fixable remediation', () => {
		const submitAttempts: SubmitWorkflowAttempt[] = [
			{
				filePath: MAIN_PATH,
				sourceHash: 'a',
				success: true,
				workflowId: 'WF_123',
			},
			{
				filePath: MAIN_PATH,
				sourceHash: 'b',
				success: false,
				errors: ['validation failed'],
				remediation: createRemediation({
					category: 'code_fixable',
					shouldEdit: true,
					guidance: 'Fix code and resubmit.',
				}),
			},
		];

		const result = resultFromPostStreamError({
			error: new Error('Unauthorized'),
			submitAttempts,
			mainWorkflowPath: MAIN_PATH,
			workItemId: 'wi_test',
			runId: 'run_test',
			taskId: 'task_test',
		});

		expect(result).toBeUndefined();
	});

	it('preserves an earlier main-path submit when a later submit failed with terminal remediation', () => {
		const submitAttempts: SubmitWorkflowAttempt[] = [
			{
				filePath: MAIN_PATH,
				sourceHash: 'a',
				success: true,
				workflowId: 'WF_123',
			},
			{
				filePath: MAIN_PATH,
				sourceHash: 'b',
				success: false,
				errors: ['setup required'],
				remediation: createRemediation({
					category: 'needs_setup',
					shouldEdit: false,
					guidance: 'Stop editing and route to setup.',
				}),
			},
		];

		const result = resultFromPostStreamError({
			error: new Error('Unauthorized'),
			submitAttempts,
			mainWorkflowPath: MAIN_PATH,
			workItemId: 'wi_test',
			runId: 'run_test',
			taskId: 'task_test',
		});

		expect(result).toBeDefined();
		expect(result!.outcome).toMatchObject({
			workflowId: 'WF_123',
			submitted: true,
		});
	});

	it('preserves an earlier saved workflow when the final submit attempt failed with terminal remediation', () => {
		const submitAttempts: SubmitWorkflowAttempt[] = [
			{
				filePath: MAIN_PATH,
				sourceHash: 'a',
				success: true,
				workflowId: 'WF_123',
			},
			{
				filePath: MAIN_PATH,
				sourceHash: 'b',
				success: false,
				errors: ['setup required after later edit'],
				remediation: createRemediation({
					category: 'needs_setup',
					shouldEdit: false,
					guidance: 'Stop editing and route to setup.',
				}),
			},
		];

		const result = resultFromLaterFailedMainSubmit({
			failedAttempt: submitAttempts[1],
			submitAttempts,
			mainWorkflowPath: MAIN_PATH,
			workItemId: 'wi_test',
			runId: 'run_test',
			taskId: 'task_test',
		});

		expect(result).toBeDefined();
		expect(result!.text).toContain('A later submit failed');
		expect(result!.outcome).toMatchObject({
			workItemId: 'wi_test',
			taskId: 'task_test',
			workflowId: 'WF_123',
			submitted: true,
		});
	});

	it('keeps supporting subworkflow IDs when recovering after a later terminal submit failure', () => {
		const submitAttempts: SubmitWorkflowAttempt[] = [
			{
				filePath: '/home/daytona/workspace/src/subworkflow.ts',
				sourceHash: 'sub',
				success: true,
				workflowId: 'WF_SUB',
			},
			{
				filePath: MAIN_PATH,
				sourceHash: 'a',
				success: true,
				workflowId: 'WF_MAIN',
				referencedWorkflowIds: ['WF_SUB'],
			},
			{
				filePath: MAIN_PATH,
				sourceHash: 'b',
				success: false,
				errors: ['setup required after later edit'],
				remediation: createRemediation({
					category: 'needs_setup',
					shouldEdit: false,
					guidance: 'Stop editing and route to setup.',
				}),
			},
		];

		const result = resultFromLaterFailedMainSubmit({
			failedAttempt: submitAttempts[2],
			submitAttempts,
			mainWorkflowPath: MAIN_PATH,
			workItemId: 'wi_test',
			runId: 'run_test',
			taskId: 'task_test',
		});

		expect(result).toBeDefined();
		expect(result!.outcome).toMatchObject({
			workflowId: 'WF_MAIN',
			submitted: true,
			supportingWorkflowIds: ['WF_SUB'],
		});
	});

	it('does not preserve an earlier saved workflow when the final submit failure is code-fixable', () => {
		const submitAttempts: SubmitWorkflowAttempt[] = [
			{
				filePath: MAIN_PATH,
				sourceHash: 'a',
				success: true,
				workflowId: 'WF_123',
			},
			{
				filePath: MAIN_PATH,
				sourceHash: 'b',
				success: false,
				errors: ['validation failed after later edit'],
				remediation: createRemediation({
					category: 'code_fixable',
					shouldEdit: true,
					guidance: 'Fix code and resubmit.',
				}),
			},
		];

		const result = resultFromLaterFailedMainSubmit({
			failedAttempt: submitAttempts[1],
			submitAttempts,
			mainWorkflowPath: MAIN_PATH,
			workItemId: 'wi_test',
			runId: 'run_test',
			taskId: 'task_test',
		});

		expect(result).toBeUndefined();
	});

	it('marks unresolved placeholder submits as saved workflows needing setup', () => {
		const submitAttempts: SubmitWorkflowAttempt[] = [
			{
				filePath: MAIN_PATH,
				sourceHash: 'abc',
				success: true,
				workflowId: 'WF_123',
				hasUnresolvedPlaceholders: true,
			},
		];

		const result = resultFromPostStreamError({
			error: new Error('Stopped after submit'),
			submitAttempts,
			mainWorkflowPath: MAIN_PATH,
			workItemId: 'wi_test',
			runId: 'run_test',
			taskId: 'task_test',
		});

		expect(result!.outcome).toMatchObject({
			workflowId: 'WF_123',
			submitted: true,
			needsUserInput: true,
			blockingReason:
				'Workflow submitted successfully, but unresolved setup values remain. Stop code edits and route to workflows(action="setup").',
			remediation: {
				category: 'needs_setup',
				shouldEdit: false,
				reason: 'mocked_credentials_or_placeholders',
			},
		});
	});
});

describe('resultFromTerminalRemediation', () => {
	it('returns terminal remediation without requiring a final auto-resubmit', () => {
		const remediation = createRemediation({
			category: 'blocked',
			shouldEdit: false,
			reason: 'workflow_save_failed',
			guidance: 'Stop editing.',
		});
		const submitAttempts: SubmitWorkflowAttempt[] = [
			{
				filePath: MAIN_PATH,
				sourceHash: 'a',
				success: true,
				workflowId: 'WF_123',
			},
			{
				filePath: MAIN_PATH,
				sourceHash: 'b',
				success: false,
				errors: ['Workflow save failed.'],
				remediation,
			},
		];

		const result = resultFromTerminalRemediation({
			remediation,
			submitAttempts,
			mainWorkflowPath: MAIN_PATH,
			workItemId: 'wi_test',
			runId: 'run_test',
			taskId: 'task_test',
		});

		expect(result).toMatchObject({
			text: 'Stop editing.',
			outcome: {
				submitted: true,
				workflowId: 'WF_123',
				blockingReason: 'Stop editing.',
				remediation,
			},
		});
	});
});

describe('supportingWorkflowIdsFromSubmitAttempts', () => {
	it('collects referenced successful non-main workflow IDs once in submit order', () => {
		const submitAttempts: SubmitWorkflowAttempt[] = [
			{
				filePath: '/home/daytona/workspace/chunks/a.ts',
				sourceHash: 'a',
				success: true,
				workflowId: 'SUB_A',
			},
			{
				filePath: '/home/daytona/workspace/chunks/setup.ts',
				sourceHash: 'setup',
				success: true,
				workflowId: 'SETUP_ONLY',
			},
			{
				filePath: '/home/daytona/workspace/chunks/b.ts',
				sourceHash: 'b',
				success: true,
				workflowId: 'SUB_B',
			},
			{
				filePath: '/home/daytona/workspace/chunks/a.ts',
				sourceHash: 'a2',
				success: true,
				workflowId: 'SUB_A',
			},
			{
				filePath: '/home/daytona/workspace/chunks/failed.ts',
				sourceHash: 'f',
				success: false,
				errors: ['failed'],
			},
			{
				filePath: MAIN_PATH,
				sourceHash: 'main',
				success: true,
				workflowId: 'WF_123',
				referencedWorkflowIds: ['SUB_A', 'SUB_B'],
			},
		];

		expect(
			supportingWorkflowIdsFromSubmitAttempts(submitAttempts, MAIN_PATH, 'WF_123', [
				'SUB_A',
				'SUB_B',
			]),
		).toEqual(['SUB_A', 'SUB_B']);
	});
});

describe('withTerminalLoopState', () => {
	it('marks a saved workflow as needing user input when verification is blocked by setup', () => {
		const outcome: WorkflowBuildOutcome = {
			workItemId: 'wi_test',
			runId: 'run_test',
			taskId: 'task_test',
			workflowId: 'wf_123',
			submitted: true,
			triggerType: 'manual_or_testable',
			needsUserInput: false,
			summary: 'Submitted workflow.',
		};
		const state: WorkflowLoopState = {
			workItemId: 'wi_test',
			threadId: 'thread_1',
			runId: 'run_test',
			workflowId: 'wf_123',
			phase: 'blocked',
			status: 'blocked',
			source: 'create',
			rebuildAttempts: 0,
			successfulSubmitSeen: true,
			postSubmitRemediationSubmitsUsed: 0,
			lastRemediation: createRemediation({
				category: 'needs_setup',
				shouldEdit: false,
				reason: 'mocked_credentials_or_placeholders',
				guidance: 'Route to setup.',
			}),
		};

		expect(withTerminalLoopState(outcome, state)).toMatchObject({
			submitted: true,
			workflowId: 'wf_123',
			needsUserInput: true,
			blockingReason: 'Route to setup.',
			remediation: {
				category: 'needs_setup',
				shouldEdit: false,
				reason: 'mocked_credentials_or_placeholders',
			},
		});
	});
});

describe('finalizeBuildResult', () => {
	it('applies terminal loop state to recovered saved-workflow results', async () => {
		const remediation = createRemediation({
			category: 'needs_setup',
			shouldEdit: false,
			reason: 'mocked_credentials_or_placeholders',
			guidance: 'Route to setup.',
		});
		const context = createMockContext({
			workflowTaskService: {
				getWorkflowLoopState: jest.fn().mockResolvedValue({
					workItemId: 'wi_test',
					threadId: 'thread_1',
					runId: 'run_test',
					workflowId: 'wf_123',
					phase: 'blocked',
					status: 'blocked',
					source: 'create',
					rebuildAttempts: 0,
					successfulSubmitSeen: true,
					postSubmitRemediationSubmitsUsed: 0,
					lastRemediation: remediation,
				}),
			} as unknown as OrchestrationContext['workflowTaskService'],
		});
		const result = await finalizeBuildResult(context, 'wi_test', {
			text: 'Recovered workflow.',
			outcome: {
				workItemId: 'wi_test',
				runId: 'run_test',
				taskId: 'task_test',
				workflowId: 'wf_123',
				submitted: true,
				triggerType: 'manual_or_testable',
				needsUserInput: false,
				summary: 'Recovered workflow.',
			},
		});

		expect(context.workflowTaskService?.getWorkflowLoopState).toHaveBeenCalledWith('wi_test');
		expect(result).toMatchObject({
			text: 'Recovered workflow.',
			outcome: {
				submitted: true,
				workflowId: 'wf_123',
				needsUserInput: true,
				blockingReason: 'Route to setup.',
				remediation: {
					category: 'needs_setup',
					shouldEdit: false,
					reason: 'mocked_credentials_or_placeholders',
				},
			},
		});
	});
});

describe('shouldRecoverSavedWorkflowAfterFailedSubmit', () => {
	it('recovers only when the failed submit carries terminal remediation', () => {
		const terminalAttempt: SubmitWorkflowAttempt = {
			filePath: MAIN_PATH,
			sourceHash: 'new-hash',
			success: false,
			errors: ['Stop editing.'],
			remediation: createRemediation({
				category: 'blocked',
				shouldEdit: false,
				reason: 'post_submit_budget_exhausted',
				guidance: 'Stop editing.',
			}),
		};
		const codeFixableAttempt: SubmitWorkflowAttempt = {
			filePath: MAIN_PATH,
			sourceHash: 'new-hash',
			success: false,
			errors: ['Fix the workflow code.'],
			remediation: createRemediation({
				category: 'code_fixable',
				shouldEdit: true,
				reason: 'validation_failed',
				guidance: 'Fix the workflow code and submit again.',
			}),
		};
		const unclassifiedAttempt: SubmitWorkflowAttempt = {
			filePath: MAIN_PATH,
			sourceHash: 'new-hash',
			success: false,
			errors: ['Unknown submit failure.'],
		};

		expect(shouldRecoverSavedWorkflowAfterFailedSubmit(terminalAttempt)).toBe(true);
		expect(shouldRecoverSavedWorkflowAfterFailedSubmit(codeFixableAttempt)).toBe(false);
		expect(shouldRecoverSavedWorkflowAfterFailedSubmit(unclassifiedAttempt)).toBe(false);
	});
});

describe('attemptFromAutoResubmit', () => {
	it('ignores a stale successful attempt when terminal guard blocked the resubmit', () => {
		const staleAttempt: SubmitWorkflowAttempt = {
			filePath: MAIN_PATH,
			sourceHash: 'old-hash',
			success: true,
			workflowId: 'WF_123',
		};
		const remediation = createRemediation({
			category: 'blocked',
			shouldEdit: false,
			reason: 'post_submit_budget_exhausted',
			guidance: 'Stop editing.',
		});
		const resubmit: SubmitWorkflowOutput = {
			success: false,
			errors: ['Stop editing.'],
			remediation,
		};

		const attempt = attemptFromAutoResubmit({
			latestAttempt: staleAttempt,
			resubmit,
			filePath: MAIN_PATH,
			sourceHash: 'new-hash',
		});

		expect(attempt).toEqual({
			filePath: MAIN_PATH,
			sourceHash: 'new-hash',
			success: false,
			errors: ['Stop editing.'],
			remediation,
		});
	});

	it('returns the fresh submit attempt when it matches the edited source hash', () => {
		const freshAttempt: SubmitWorkflowAttempt = {
			filePath: MAIN_PATH,
			sourceHash: 'new-hash',
			success: true,
			workflowId: 'WF_456',
		};

		const attempt = attemptFromAutoResubmit({
			latestAttempt: freshAttempt,
			resubmit: { success: true, workflowId: 'WF_456' },
			filePath: MAIN_PATH,
			sourceHash: 'new-hash',
		});

		expect(attempt).toBe(freshAttempt);
	});
});

describe('settleMissingMainWorkflowSubmit', () => {
	function createWorkflowTaskService() {
		return {
			reportBuildOutcome: jest.fn().mockResolvedValue({ type: 'continue_building' }),
			reportVerificationVerdict: jest.fn(),
			getBuildOutcome: jest.fn().mockResolvedValue(undefined),
			getWorkflowLoopState: jest.fn().mockResolvedValue(undefined),
			updateBuildOutcome: jest.fn(),
		} as unknown as OrchestrationContext['workflowTaskService'];
	}

	function sourceHash(source: string): string {
		const snapshot = createMainWorkflowSnapshot(source);
		if (!snapshot.sourceHash) throw new Error('Expected snapshot hash');
		return snapshot.sourceHash;
	}

	type BuildResult = {
		text: string;
		outcome: WorkflowBuildOutcome;
	};

	function createRecoveredSubmitHandler(): jest.Mock<Promise<BuildResult>, [BuildResult]> {
		return jest.fn(async (result: BuildResult) => await Promise.resolve(result));
	}

	function createSuccessfulSubmitHandler(): jest.Mock<
		Promise<BuildResult>,
		[SubmitWorkflowAttempt]
	> {
		return jest.fn(
			async (attempt: SubmitWorkflowAttempt) =>
				await Promise.resolve(createSuccessfulResult(attempt)),
		);
	}

	function createSubmitTool(handler: (args: Record<string, unknown>) => SubmitWorkflowOutput) {
		const handlerMock = jest.fn(
			async (input: unknown) => await Promise.resolve(handler(input as Record<string, unknown>)),
		);
		return {
			name: 'submit-workflow',
			description: 'Submit workflow stub',
			handler: handlerMock,
		};
	}

	function createBareSubmitTool() {
		return {
			name: 'submit-workflow',
			description: 'Submit workflow stub',
			handler: jest.fn(),
		};
	}

	function createSuccessfulResult(attempt: SubmitWorkflowAttempt): {
		text: string;
		outcome: WorkflowBuildOutcome;
	} {
		return {
			text: 'Submitted',
			outcome: {
				workItemId: 'wi_test',
				runId: 'run_test',
				taskId: 'task_test',
				workflowId: attempt.workflowId,
				submitted: true,
				triggerType: 'manual_or_testable',
				needsUserInput: false,
				summary: 'Submitted',
			},
		};
	}

	it('final-submits a newly created main workflow file', async () => {
		const trackTelemetry = jest.fn();
		const context = createMockContext({
			trackTelemetry,
			workflowTaskService: createWorkflowTaskService(),
		});
		const submitAttempts = new Map<string, SubmitWorkflowAttempt>();
		const submitAttemptHistory: SubmitWorkflowAttempt[] = [];
		const currentMainWorkflow = 'workflow code';
		const finalAttempt: SubmitWorkflowAttempt = {
			filePath: MAIN_PATH,
			sourceHash: sourceHash(currentMainWorkflow),
			success: true,
			workflowId: 'WF_CREATED',
		};
		const submitTool = createSubmitTool(() => {
			submitAttempts.set(MAIN_PATH, finalAttempt);
			submitAttemptHistory.push(finalAttempt);
			return { success: true, workflowId: 'WF_CREATED' };
		});
		const onSuccessfulSubmit = createSuccessfulSubmitHandler();

		const result = await settleMissingMainWorkflowSubmit({
			context,
			workItemId: 'wi_test',
			runId: 'run_test',
			taskId: 'task_test',
			workflowId: undefined,
			mainWorkflowPath: MAIN_PATH,
			initialMainWorkflowSnapshot: createMainWorkflowSnapshot(null),
			currentMainWorkflow,
			currentMainWorkflowHash: finalAttempt.sourceHash,
			submitTool,
			submitAttempts,
			submitAttemptHistory,
			finalText: 'Builder finished',
			onSuccessfulSubmit,
			onRecoveredSubmit: createRecoveredSubmitHandler(),
		});

		expect(submitTool.handler).toHaveBeenCalledWith({ filePath: MAIN_PATH }, {});
		expect(trackTelemetry).toHaveBeenCalledWith(
			'Builder finished without submit',
			expect.objectContaining({
				thread_id: 'test-thread',
				run_id: 'run_test',
				work_item_id: 'wi_test',
				has_main_workflow_file: true,
				main_workflow_changed: true,
				final_settlement: 'final_submit',
			}),
		);
		expect(onSuccessfulSubmit).toHaveBeenCalledWith(finalAttempt);
		expect(result.outcome).toMatchObject({ submitted: true, workflowId: 'WF_CREATED' });
	});

	it('uses a recorded successful final attempt if the submit handler throws afterward', async () => {
		const context = createMockContext({
			workflowTaskService: createWorkflowTaskService(),
		});
		const submitAttempts = new Map<string, SubmitWorkflowAttempt>();
		const submitAttemptHistory: SubmitWorkflowAttempt[] = [];
		const currentMainWorkflow = 'workflow code';
		const finalAttempt: SubmitWorkflowAttempt = {
			filePath: MAIN_PATH,
			sourceHash: sourceHash(currentMainWorkflow),
			success: true,
			workflowId: 'WF_CREATED',
		};
		const submitTool = createSubmitTool(() => {
			submitAttempts.set(MAIN_PATH, finalAttempt);
			submitAttemptHistory.push(finalAttempt);
			throw new Error('report failed');
		});
		const onSuccessfulSubmit = createSuccessfulSubmitHandler();

		const result = await settleMissingMainWorkflowSubmit({
			context,
			workItemId: 'wi_test',
			runId: 'run_test',
			taskId: 'task_test',
			workflowId: undefined,
			mainWorkflowPath: MAIN_PATH,
			initialMainWorkflowSnapshot: createMainWorkflowSnapshot(null),
			currentMainWorkflow,
			currentMainWorkflowHash: finalAttempt.sourceHash,
			submitTool,
			submitAttempts,
			submitAttemptHistory,
			finalText: 'Builder finished',
			onSuccessfulSubmit,
			onRecoveredSubmit: createRecoveredSubmitHandler(),
		});

		expect(onSuccessfulSubmit).toHaveBeenCalledWith(finalAttempt);
		expect(result.outcome).toMatchObject({
			submitted: true,
			workflowId: 'WF_CREATED',
		});
	});

	it('reports not_submitted when an existing preloaded workflow is unchanged', async () => {
		const workflowTaskService = createWorkflowTaskService();
		const context = createMockContext({ workflowTaskService });
		const unchangedWorkflow = 'existing code';
		const submitTool = createBareSubmitTool();

		const result = await settleMissingMainWorkflowSubmit({
			context,
			workItemId: 'wi_test',
			runId: 'run_test',
			taskId: 'task_test',
			workflowId: 'WF_EXISTING',
			mainWorkflowPath: MAIN_PATH,
			initialMainWorkflowSnapshot: createMainWorkflowSnapshot(unchangedWorkflow),
			currentMainWorkflow: unchangedWorkflow,
			currentMainWorkflowHash: sourceHash(unchangedWorkflow),
			submitTool,
			submitAttempts: new Map(),
			submitAttemptHistory: [],
			finalText: 'Builder finished',
			onSuccessfulSubmit: createSuccessfulSubmitHandler(),
			onRecoveredSubmit: createRecoveredSubmitHandler(),
		});

		expect(submitTool.handler).not.toHaveBeenCalled();
		const reportBuildOutcome = workflowTaskService?.reportBuildOutcome as jest.Mock<
			Promise<unknown>,
			[WorkflowBuildOutcome]
		>;
		const reportedOutcome = reportBuildOutcome.mock.calls[0]?.[0];
		expect(reportedOutcome).toMatchObject({
			submitted: false,
			failureSignature: 'workflow:not_submitted',
			verificationReadiness: {
				status: 'not_verifiable',
				reason: 'not-submitted',
			},
		});
		expect(result.outcome).toMatchObject({
			submitted: false,
			failureSignature: 'workflow:not_submitted',
		});
	});

	it('reports not_submitted when no main workflow file exists', async () => {
		const workflowTaskService = createWorkflowTaskService();
		const context = createMockContext({ workflowTaskService });
		const submitTool = createBareSubmitTool();

		const result = await settleMissingMainWorkflowSubmit({
			context,
			workItemId: 'wi_test',
			runId: 'run_test',
			taskId: 'task_test',
			workflowId: undefined,
			mainWorkflowPath: MAIN_PATH,
			initialMainWorkflowSnapshot: createMainWorkflowSnapshot(null),
			currentMainWorkflow: null,
			currentMainWorkflowHash: sourceHash(''),
			submitTool,
			submitAttempts: new Map(),
			submitAttemptHistory: [],
			finalText: 'Builder finished',
			onSuccessfulSubmit: createSuccessfulSubmitHandler(),
			onRecoveredSubmit: createRecoveredSubmitHandler(),
		});

		expect(submitTool.handler).not.toHaveBeenCalled();
		expect(result.text).toBe(
			'Error: workflow builder finished without creating or submitting /src/workflow.ts.',
		);
		expect(result.outcome).toMatchObject({
			submitted: false,
			failureSignature: 'workflow:not_submitted',
		});
	});

	it('final-submits a changed preloaded workflow with the existing workflow ID', async () => {
		const context = createMockContext({ workflowTaskService: createWorkflowTaskService() });
		const submitAttempts = new Map<string, SubmitWorkflowAttempt>();
		const submitAttemptHistory: SubmitWorkflowAttempt[] = [];
		const changedWorkflow = 'changed code';
		const finalAttempt: SubmitWorkflowAttempt = {
			filePath: MAIN_PATH,
			sourceHash: sourceHash(changedWorkflow),
			success: true,
			workflowId: 'WF_EXISTING',
		};
		const submitTool = createSubmitTool(() => {
			submitAttempts.set(MAIN_PATH, finalAttempt);
			submitAttemptHistory.push(finalAttempt);
			return { success: true, workflowId: 'WF_EXISTING' };
		});
		const onSuccessfulSubmit = createSuccessfulSubmitHandler();

		await settleMissingMainWorkflowSubmit({
			context,
			workItemId: 'wi_test',
			runId: 'run_test',
			taskId: 'task_test',
			workflowId: 'WF_EXISTING',
			mainWorkflowPath: MAIN_PATH,
			initialMainWorkflowSnapshot: createMainWorkflowSnapshot('existing code'),
			currentMainWorkflow: changedWorkflow,
			currentMainWorkflowHash: finalAttempt.sourceHash,
			submitTool,
			submitAttempts,
			submitAttemptHistory,
			finalText: 'Builder finished',
			onSuccessfulSubmit,
			onRecoveredSubmit: createRecoveredSubmitHandler(),
		});

		expect(submitTool.handler).toHaveBeenCalledWith(
			{
				filePath: MAIN_PATH,
				workflowId: 'WF_EXISTING',
			},
			{},
		);
		expect(onSuccessfulSubmit).toHaveBeenCalledWith(finalAttempt);
	});

	it('returns a failed outcome when the final submit is code-fixable', async () => {
		const context = createMockContext({ workflowTaskService: createWorkflowTaskService() });
		const submitAttempts = new Map<string, SubmitWorkflowAttempt>();
		const submitAttemptHistory: SubmitWorkflowAttempt[] = [];
		const changedWorkflow = 'changed code';
		const failedAttempt: SubmitWorkflowAttempt = {
			filePath: MAIN_PATH,
			sourceHash: sourceHash(changedWorkflow),
			success: false,
			errors: ['Validation failed'],
			remediation: createRemediation({
				category: 'code_fixable',
				shouldEdit: true,
				reason: 'validation_failed',
				guidance: 'Fix the workflow code and submit again.',
			}),
		};
		const submitTool = createSubmitTool(() => {
			submitAttempts.set(MAIN_PATH, failedAttempt);
			submitAttemptHistory.push(failedAttempt);
			return { success: false, errors: ['Validation failed'] };
		});
		const onSuccessfulSubmit = createSuccessfulSubmitHandler();

		const result = await settleMissingMainWorkflowSubmit({
			context,
			workItemId: 'wi_test',
			runId: 'run_test',
			taskId: 'task_test',
			workflowId: undefined,
			mainWorkflowPath: MAIN_PATH,
			initialMainWorkflowSnapshot: createMainWorkflowSnapshot(null),
			currentMainWorkflow: changedWorkflow,
			currentMainWorkflowHash: failedAttempt.sourceHash,
			submitTool,
			submitAttempts,
			submitAttemptHistory,
			finalText: 'Builder finished',
			onSuccessfulSubmit,
			onRecoveredSubmit: createRecoveredSubmitHandler(),
		});

		expect(onSuccessfulSubmit).not.toHaveBeenCalled();
		expect(result).toMatchObject({
			text: 'Error: final submit of /src/workflow.ts failed. Validation failed',
			outcome: {
				submitted: false,
				failureSignature: 'Validation failed',
				remediation: { reason: 'validation_failed' },
			},
		});
	});

	it('reports final submit failure when no main attempt is recorded', async () => {
		const workflowTaskService = createWorkflowTaskService();
		const context = createMockContext({ workflowTaskService });
		const currentMainWorkflow = 'workflow code';
		const submitTool = createSubmitTool(() => ({ success: true, workflowId: 'WF_CREATED' }));

		const result = await settleMissingMainWorkflowSubmit({
			context,
			workItemId: 'wi_test',
			runId: 'run_test',
			taskId: 'task_test',
			workflowId: undefined,
			mainWorkflowPath: MAIN_PATH,
			initialMainWorkflowSnapshot: createMainWorkflowSnapshot(null),
			currentMainWorkflow,
			currentMainWorkflowHash: sourceHash(currentMainWorkflow),
			submitTool,
			submitAttempts: new Map(),
			submitAttemptHistory: [],
			finalText: 'Builder finished',
			onSuccessfulSubmit: createSuccessfulSubmitHandler(),
			onRecoveredSubmit: createRecoveredSubmitHandler(),
		});

		const reportBuildOutcome = workflowTaskService?.reportBuildOutcome as jest.Mock<
			Promise<unknown>,
			[WorkflowBuildOutcome]
		>;
		expect(reportBuildOutcome).toHaveBeenCalledWith(
			expect.objectContaining({
				submitted: false,
				failureSignature: 'workflow:final_submit_failed',
			}),
		);
		expect(result.outcome).toMatchObject({
			submitted: false,
			failureSignature: 'workflow:final_submit_failed',
		});
	});

	it('returns terminal remediation from the final submit when there is no earlier main submit', async () => {
		const context = createMockContext({ workflowTaskService: createWorkflowTaskService() });
		const submitAttempts = new Map<string, SubmitWorkflowAttempt>();
		const submitAttemptHistory: SubmitWorkflowAttempt[] = [];
		const changedWorkflow = 'changed code';
		const remediation = createRemediation({
			category: 'blocked',
			shouldEdit: false,
			reason: 'pre_save_submit_budget_exhausted',
			guidance: 'Stop editing.',
		});
		const failedAttempt: SubmitWorkflowAttempt = {
			filePath: MAIN_PATH,
			sourceHash: sourceHash(changedWorkflow),
			success: false,
			errors: ['Stop editing.'],
			remediation,
		};
		const submitTool = createSubmitTool(() => {
			submitAttempts.set(MAIN_PATH, failedAttempt);
			submitAttemptHistory.push(failedAttempt);
			return { success: false, errors: ['Stop editing.'], remediation };
		});

		const result = await settleMissingMainWorkflowSubmit({
			context,
			workItemId: 'wi_test',
			runId: 'run_test',
			taskId: 'task_test',
			workflowId: undefined,
			mainWorkflowPath: MAIN_PATH,
			initialMainWorkflowSnapshot: createMainWorkflowSnapshot(null),
			currentMainWorkflow: changedWorkflow,
			currentMainWorkflowHash: failedAttempt.sourceHash,
			submitTool,
			submitAttempts,
			submitAttemptHistory,
			finalText: 'Builder finished',
			onSuccessfulSubmit: createSuccessfulSubmitHandler(),
			onRecoveredSubmit: createRecoveredSubmitHandler(),
		});

		expect(result.outcome).toMatchObject({
			submitted: false,
			remediation: { shouldEdit: false, reason: 'pre_save_submit_budget_exhausted' },
		});
	});

	it('keeps supporting subworkflow submits available when the final main submit succeeds', async () => {
		const context = createMockContext({ workflowTaskService: createWorkflowTaskService() });
		const submitAttempts = new Map<string, SubmitWorkflowAttempt>();
		const submitAttemptHistory: SubmitWorkflowAttempt[] = [
			{
				filePath: '/home/daytona/workspace/src/subworkflow.ts',
				sourceHash: 'sub',
				success: true,
				workflowId: 'WF_SUB',
			},
		];
		const changedWorkflow = 'changed code';
		const finalAttempt: SubmitWorkflowAttempt = {
			filePath: MAIN_PATH,
			sourceHash: sourceHash(changedWorkflow),
			success: true,
			workflowId: 'WF_MAIN',
			referencedWorkflowIds: ['WF_SUB'],
		};
		const submitTool = createSubmitTool(() => {
			submitAttempts.set(MAIN_PATH, finalAttempt);
			submitAttemptHistory.push(finalAttempt);
			return { success: true, workflowId: 'WF_MAIN' };
		});
		const onSuccessfulSubmit = jest.fn(
			async (attempt: SubmitWorkflowAttempt) =>
				await Promise.resolve({
					...createSuccessfulResult(attempt),
					outcome: {
						...createSuccessfulResult(attempt).outcome,
						supportingWorkflowIds: supportingWorkflowIdsFromSubmitAttempts(
							submitAttemptHistory,
							MAIN_PATH,
							attempt.workflowId,
							attempt.referencedWorkflowIds,
						),
					},
				}),
		);

		const result = await settleMissingMainWorkflowSubmit({
			context,
			workItemId: 'wi_test',
			runId: 'run_test',
			taskId: 'task_test',
			workflowId: undefined,
			mainWorkflowPath: MAIN_PATH,
			initialMainWorkflowSnapshot: createMainWorkflowSnapshot(null),
			currentMainWorkflow: changedWorkflow,
			currentMainWorkflowHash: finalAttempt.sourceHash,
			submitTool,
			submitAttempts,
			submitAttemptHistory,
			finalText: 'Builder finished',
			onSuccessfulSubmit,
			onRecoveredSubmit: createRecoveredSubmitHandler(),
		});

		expect(result.outcome.supportingWorkflowIds).toEqual(['WF_SUB']);
	});
});

describe('createBuildWorkflowAgentTool — plan-enforcement guard', () => {
	const ORIGINAL_ENV = process.env.N8N_INSTANCE_AI_ENFORCE_BUILD_VIA_PLAN;

	afterEach(() => {
		if (ORIGINAL_ENV === undefined) {
			delete process.env.N8N_INSTANCE_AI_ENFORCE_BUILD_VIA_PLAN;
		} else {
			process.env.N8N_INSTANCE_AI_ENFORCE_BUILD_VIA_PLAN = ORIGINAL_ENV;
		}
	});

	it('rejects direct calls outside a replan/checkpoint follow-up with an imperative STOP message', async () => {
		const context = createMockContext();
		const tool = createBuildWorkflowAgentTool(context);

		const out = await executeTool(tool, { task: 'Build a Slack notifier' });

		expect(out.taskId).toBe('');
		expect(out.result).toMatch(/^STOP\./);
		expect(out.result).toContain('`plan`');
		expect(out.result).toContain('bypassPlan');
		expect(context.logger.warn).toHaveBeenCalledWith(
			'build-workflow-with-agent called outside plan/replan context — rejecting',
			expect.objectContaining({ threadId: 'test-thread' }),
		);
	});

	it('rejects bypassPlan=true without a workflowId with an imperative STOP message', async () => {
		const context = createMockContext();
		const tool = createBuildWorkflowAgentTool(context);

		const out = await executeTool(tool, {
			task: 'build something shiny',
			bypassPlan: true,
			reason: 'I feel like skipping the plan today',
		});

		expect(out.taskId).toBe('');
		expect(out.result).toMatch(/^STOP\./);
		expect(out.result).toMatch(/EXISTING workflow/);
		expect(out.result).toContain('`workflowId`');
		expect(out.result).toContain('`plan`');
	});

	it('rejects bypassPlan=true without a reason with an imperative STOP message', async () => {
		const context = createMockContext();
		const tool = createBuildWorkflowAgentTool(context);

		const out = await executeTool(tool, {
			task: 'patch one expression',
			workflowId: 'WF_EXISTING',
			bypassPlan: true,
		});

		expect(out.taskId).toBe('');
		expect(out.result).toMatch(/^STOP\./);
		expect(out.result).toContain('`reason`');
	});

	it('allows the call when bypassPlan=true with a reason is provided', async () => {
		const context = createMockContext({
			domainContext: createMockDomainContext({ updateWorkflow: 'always_allow' }),
		});
		const tool = createBuildWorkflowAgentTool(context);

		const out = await executeTool(tool, {
			task: 'patch one expression',
			workflowId: 'WF_EXISTING',
			bypassPlan: true,
			reason: 'Swap Slack channel on this notifier.',
		});

		// Guard passes → reaches startBuildWorkflowAgentTask, which short-circuits on
		// missing spawnBackgroundTask. The point is we got past the guard, not what
		// the downstream does.
		expect(out.result).not.toMatch(/^STOP\./);
		const warnMock = context.logger.warn as jest.Mock<void, [string, Record<string, unknown>?]>;
		expect(warnMock.mock.calls.some((c) => c[0].includes('bypassing plan'))).toBe(true);
	});

	it('allows direct calls in a replan follow-up', async () => {
		const context = createMockContext({ isReplanFollowUp: true });
		const tool = createBuildWorkflowAgentTool(context);

		const out = await executeTool(tool, { task: 'retry after failure' });

		expect(out.result).not.toMatch(/^STOP\./);
		expect(context.logger.warn).not.toHaveBeenCalledWith(
			'build-workflow-with-agent called outside plan/replan context — rejecting',
			expect.anything(),
		);
	});

	it('allows direct calls in a checkpoint follow-up', async () => {
		const context = createMockContext({ isCheckpointFollowUp: true });
		const tool = createBuildWorkflowAgentTool(context);

		const out = await executeTool(tool, { task: 'checkpoint branch' });

		expect(out.result).not.toMatch(/^STOP\./);
	});

	it('skips the guard when the env flag is disabled', async () => {
		process.env.N8N_INSTANCE_AI_ENFORCE_BUILD_VIA_PLAN = 'false';
		const context = createMockContext();
		const tool = createBuildWorkflowAgentTool(context);

		const out = await executeTool(tool, { task: 'build directly' });

		expect(out.result).not.toContain('STOP');
	});

	// If the LLM keeps retrying the same rejected call, the tool throws after
	// PLAN_GUARD_REJECTION_LIMIT (3) consecutive rejections so the loop surfaces
	// as a clean failure instead of a stall.
	it('throws after three consecutive plan-guard rejections in the same tool instance', async () => {
		const context = createMockContext();
		const tool = createBuildWorkflowAgentTool(context);

		const first = await executeTool(tool, { task: 'one' });
		expect(first.result).toMatch(/^STOP\./);

		const second = await executeTool(tool, { task: 'two' });
		expect(second.result).toMatch(/^STOP\./);

		const third = executeTool(tool, { task: 'three' });
		await expect(third).rejects.toThrow(UserError);
		await expect(third).rejects.toThrow(/looped on .* rejections/);
		expect(context.logger.warn).toHaveBeenCalledWith(
			'build-workflow-with-agent plan-guard rejection limit reached — aborting run',
			expect.objectContaining({
				threadId: 'test-thread',
				rejectionCount: 3,
			}),
		);
	});

	it('counts mixed-cause rejections (missing bypassPlan / workflowId / reason) toward the same limit', async () => {
		const context = createMockContext();
		const tool = createBuildWorkflowAgentTool(context);

		// 1: missing bypassPlan
		await executeTool(tool, { task: 'one' });
		// 2: bypassPlan=true but missing workflowId
		await executeTool(tool, {
			task: 'two',
			bypassPlan: true,
			reason: 'patch a thing',
		});
		// 3: bypassPlan=true + workflowId but missing reason — throws
		const third = executeTool(tool, {
			task: 'three',
			bypassPlan: true,
			workflowId: 'WF_EXISTING',
		});
		await expect(third).rejects.toThrow(UserError);
		await expect(third).rejects.toThrow(/looped on .* rejections/);
	});

	it('resets the rejection counter when a call gets past the guard', async () => {
		const context = createMockContext({
			domainContext: createMockDomainContext({ updateWorkflow: 'always_allow' }),
		});
		const tool = createBuildWorkflowAgentTool(context);

		// Two rejections — counter at 2.
		await executeTool(tool, { task: 'one' });
		await executeTool(tool, { task: 'two' });

		// A valid bypassPlan call gets past the guard (startBuildWorkflowAgentTask
		// short-circuits on missing spawnBackgroundTask, but the counter resets
		// BEFORE that call, so the counter is back to 0).
		const past = await executeTool(tool, {
			task: 'edit an existing workflow',
			workflowId: 'WF_EXISTING',
			bypassPlan: true,
			reason: 'Swap Slack channel on this notifier.',
		});
		expect(past.result).not.toMatch(/^STOP\./);

		// Two more rejections — the counter restarts from 0, so this must NOT throw.
		const fourth = await executeTool(tool, { task: 'three' });
		expect(fourth.result).toMatch(/^STOP\./);
		const fifth = await executeTool(tool, { task: 'four' });
		expect(fifth.result).toMatch(/^STOP\./);
	});

	it('keeps the rejection counter per tool instance (one orchestrator run = one counter)', async () => {
		const contextA = createMockContext();
		const toolA = createBuildWorkflowAgentTool(contextA);

		await executeTool(toolA, { task: 'a-one' });
		await executeTool(toolA, { task: 'a-two' });

		// A different tool instance must start with a fresh counter.
		const contextB = createMockContext();
		const toolB = createBuildWorkflowAgentTool(contextB);

		const out = await executeTool(toolB, { task: 'b-one' });
		expect(out.result).toMatch(/^STOP\./);

		// And toolA, which is at 2, throws on its next call as expected.
		await expect(executeTool(toolA, { task: 'a-three' })).rejects.toThrow(
			/looped on .* rejections/,
		);
	});

	it('does not increment the counter or throw when the guard is disabled by env flag', async () => {
		process.env.N8N_INSTANCE_AI_ENFORCE_BUILD_VIA_PLAN = 'false';
		const context = createMockContext();
		const tool = createBuildWorkflowAgentTool(context);

		// Many calls with input shapes that would otherwise trip the guard — none throw.
		for (let i = 0; i < 5; i++) {
			const out = await executeTool(tool, { task: `call-${i}` });
			expect(out.result).not.toMatch(/^STOP\./);
		}
	});

	it('does not increment the counter when the run is a replan follow-up', async () => {
		// Counter only advances when the guard branch actually rejects. A replan
		// follow-up skips the guard, so the counter stays at zero and a later
		// rejection-prone call sees a fresh counter.
		const context = createMockContext({ isReplanFollowUp: true });
		const tool = createBuildWorkflowAgentTool(context);

		// Many follow-up bypasses — none should throw.
		for (let i = 0; i < 5; i++) {
			const out = await executeTool(tool, { task: `replan-${i}` });
			expect(out.result).not.toMatch(/^STOP\./);
		}
	});
});

describe('createBuildWorkflowAgentTool — existing workflow approval', () => {
	const ORIGINAL_ENV = process.env.N8N_INSTANCE_AI_ENFORCE_BUILD_VIA_PLAN;

	afterEach(() => {
		if (ORIGINAL_ENV === undefined) {
			delete process.env.N8N_INSTANCE_AI_ENFORCE_BUILD_VIA_PLAN;
		} else {
			process.env.N8N_INSTANCE_AI_ENFORCE_BUILD_VIA_PLAN = ORIGINAL_ENV;
		}
	});

	const editInput = {
		task: 'patch one expression',
		workflowId: 'WF_EXISTING',
		bypassPlan: true,
		reason: 'Swap Slack channel on this notifier.',
	};

	it('suspends before spawning when updateWorkflow requires approval', async () => {
		const context = createSpawnableContext({ updateWorkflow: 'require_approval' });
		const suspend = jest.fn().mockResolvedValue(undefined);
		const tool = createBuildWorkflowAgentTool(context);

		const out = await executeTool(tool, editInput, { suspend });

		expect(out).toBeUndefined();
		expect(suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				message:
					'Edit existing workflow "Existing Workflow" (ID: WF_EXISTING)? Reason: Swap Slack channel on this notifier.',
				severity: 'warning',
			}),
		);
		expect(context.spawnBackgroundTask).not.toHaveBeenCalled();
	});

	it('spawns when approval resume data is approved', async () => {
		const context = createSpawnableContext({ updateWorkflow: 'require_approval' });
		const tool = createBuildWorkflowAgentTool(context);

		const out = await executeTool(tool, editInput, {
			resumeData: { approved: true },
		});

		expect(out.taskId).toMatch(/^build-/);
		expect(context.spawnBackgroundTask).toHaveBeenCalledTimes(1);
	});

	it('does not spawn when approval resume data is denied', async () => {
		const context = createSpawnableContext({ updateWorkflow: 'require_approval' });
		const tool = createBuildWorkflowAgentTool(context);

		const out = await executeTool(tool, editInput, {
			resumeData: { approved: false },
		});

		expect(out).toEqual({ result: 'User declined the workflow edit.', taskId: '' });
		expect(context.spawnBackgroundTask).not.toHaveBeenCalled();
	});

	it('skips suspend when updateWorkflow is always_allow', async () => {
		const context = createSpawnableContext({ updateWorkflow: 'always_allow' });
		const suspend = jest.fn().mockResolvedValue(undefined);
		const tool = createBuildWorkflowAgentTool(context);

		await executeTool(tool, editInput, { suspend });

		expect(suspend).not.toHaveBeenCalled();
		expect(context.spawnBackgroundTask).toHaveBeenCalledTimes(1);
	});

	it('does not apply the edit approval gate without a workflowId', async () => {
		process.env.N8N_INSTANCE_AI_ENFORCE_BUILD_VIA_PLAN = 'false';
		const context = createSpawnableContext({ updateWorkflow: 'require_approval' });
		const suspend = jest.fn().mockResolvedValue(undefined);
		const tool = createBuildWorkflowAgentTool(context);

		await executeTool(tool, { task: 'build a new workflow' }, { suspend });

		expect(suspend).not.toHaveBeenCalled();
		expect(context.spawnBackgroundTask).toHaveBeenCalledTimes(1);
	});

	it('does not apply the edit approval gate without domain context', async () => {
		const context = createMockContext({
			domainTools: mockToolRegistry({ 'build-workflow': mockBuiltTool('build-workflow') }),
			spawnBackgroundTask: jest.fn().mockReturnValue({
				status: 'started',
				taskId: 'build-task',
				agentId: 'agent-builder',
			}),
		});
		const suspend = jest.fn().mockResolvedValue(undefined);
		const tool = createBuildWorkflowAgentTool(context);

		await executeTool(tool, editInput, { suspend });

		expect(suspend).not.toHaveBeenCalled();
		expect(context.spawnBackgroundTask).toHaveBeenCalledTimes(1);
	});

	it('skips suspend in a replan follow-up', async () => {
		const context = createSpawnableContext(
			{ updateWorkflow: 'require_approval' },
			{ isReplanFollowUp: true },
		);
		const suspend = jest.fn().mockResolvedValue(undefined);
		const tool = createBuildWorkflowAgentTool(context);

		await executeTool(tool, editInput, { suspend });

		expect(suspend).not.toHaveBeenCalled();
		expect(context.spawnBackgroundTask).toHaveBeenCalledTimes(1);
	});

	it('skips suspend in a checkpoint follow-up', async () => {
		const context = createSpawnableContext(
			{ updateWorkflow: 'require_approval' },
			{ isCheckpointFollowUp: true },
		);
		const suspend = jest.fn().mockResolvedValue(undefined);
		const tool = createBuildWorkflowAgentTool(context);

		await executeTool(tool, editInput, { suspend });

		expect(suspend).not.toHaveBeenCalled();
		expect(context.spawnBackgroundTask).toHaveBeenCalledTimes(1);
	});

	it('denies without suspend or spawn when updateWorkflow is blocked', async () => {
		const context = createSpawnableContext({ updateWorkflow: 'blocked' });
		const suspend = jest.fn().mockResolvedValue(undefined);
		const tool = createBuildWorkflowAgentTool(context);

		const out = await executeTool(tool, editInput, { suspend });

		expect(out).toEqual({ result: 'Action blocked by admin', taskId: '' });
		expect(suspend).not.toHaveBeenCalled();
		expect(context.spawnBackgroundTask).not.toHaveBeenCalled();
	});

	it('denies branch read-only edits without suspend or spawn', async () => {
		const readOnlyPermissions = applyBranchReadOnlyOverrides({
			...DEFAULT_INSTANCE_AI_PERMISSIONS,
		});
		const context = createSpawnableContext(readOnlyPermissions);
		const suspend = jest.fn().mockResolvedValue(undefined);
		const tool = createBuildWorkflowAgentTool(context);

		const out = await executeTool(tool, editInput, { suspend });

		expect(out).toEqual({ result: 'Action blocked by admin', taskId: '' });
		expect(suspend).not.toHaveBeenCalled();
		expect(context.spawnBackgroundTask).not.toHaveBeenCalled();
	});

	it('skips suspend when the workflow was created earlier in the plan cycle', async () => {
		const context = createSpawnableContext({ updateWorkflow: 'require_approval' });
		(context.domainContext as InstanceAiContext).aiCreatedWorkflowIds = new Set([
			editInput.workflowId,
		]);
		const suspend = jest.fn().mockResolvedValue(undefined);
		const tool = createBuildWorkflowAgentTool(context);

		await executeTool(tool, editInput, { suspend });

		expect(suspend).not.toHaveBeenCalled();
		expect(context.spawnBackgroundTask).toHaveBeenCalledTimes(1);
	});

	it('still denies blocked edits even when the workflow is in the active plan cycle', async () => {
		const context = createSpawnableContext({ updateWorkflow: 'blocked' });
		(context.domainContext as InstanceAiContext).aiCreatedWorkflowIds = new Set([
			editInput.workflowId,
		]);
		const suspend = jest.fn().mockResolvedValue(undefined);
		const tool = createBuildWorkflowAgentTool(context);

		const out = await executeTool(tool, editInput, { suspend });

		expect(out).toEqual({ result: 'Action blocked by admin', taskId: '' });
		expect(suspend).not.toHaveBeenCalled();
		expect(context.spawnBackgroundTask).not.toHaveBeenCalled();
	});
});

describe('recordSuccessfulWorkflowBuilds', () => {
	it('records workflow IDs returned from successful build-workflow executions', async () => {
		const onWorkflowId = jest.fn();
		const input = { prompt: 'build it' };
		const context = { runId: 'run-1' };
		const result = { success: true, workflowId: 'wf-main', displayName: 'Main' };
		const handler = jest.fn(
			async (_input: unknown, _context?: unknown) => await Promise.resolve(result),
		);
		const tool = { name: 'build-workflow', description: 'build-workflow', handler };

		recordSuccessfulWorkflowBuilds(tool, onWorkflowId);

		await expect(executeTool(tool, input, context)).resolves.toBe(result);
		expect(handler).toHaveBeenCalledWith(input, context);
		expect(onWorkflowId).toHaveBeenCalledWith('wf-main');
	});

	it('does not record failed or incomplete build-workflow results', async () => {
		const onWorkflowId = jest.fn();
		const handler = jest
			.fn()
			.mockResolvedValueOnce({ success: false, workflowId: 'wf-failed' })
			.mockResolvedValueOnce({ success: true });
		const tool = { name: 'build-workflow', description: 'build-workflow', handler };

		recordSuccessfulWorkflowBuilds(tool, onWorkflowId);

		await executeTool(tool, {});
		await executeTool(tool, {});
		expect(onWorkflowId).not.toHaveBeenCalled();
	});
});
