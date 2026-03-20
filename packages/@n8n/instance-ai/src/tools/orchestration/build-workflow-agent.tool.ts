/**
 * Preconfigured Workflow Builder Agent Tool
 *
 * Creates a focused sub-agent that writes TypeScript SDK code and validates it.
 * Two modes:
 * - Sandbox mode (when workspace is available): agent works with real files + tsc
 * - Tool mode (fallback): agent uses build-workflow tool with string-based code
 *
 * Pattern follows browser-credential-setup.tool.ts — direct Agent instantiation.
 */

import { Agent } from '@mastra/core/agent';
import type { ToolsInput } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import type { InstanceAiWorkflowBuildTaskOutcome } from '@n8n/api-types';
import { generateWorkflowCode } from '@n8n/workflow-sdk';
import { nanoid } from 'nanoid';
import { createHash } from 'node:crypto';
import { z } from 'zod';

import { BUILDER_AGENT_PROMPT, SANDBOX_BUILDER_AGENT_PROMPT } from './build-workflow-agent.prompt';
import { truncateLabel } from './display-utils';
import { createBackgroundTaskExecutionKey } from './execution-key';
import { registerWithMastra } from '../../agent/register-with-mastra';
import { createSubAgentMemory, subAgentResourceId } from '../../memory/sub-agent-memory';
import { formatPreviousAttempts } from '../../storage/iteration-log';
import { consumeStreamWithHitl } from '../../stream/consume-with-hitl';
import type { BackgroundTaskResult, OrchestrationContext } from '../../types';
import { SDK_IMPORT_STATEMENT } from '../../workflow-builder/extract-code';
import type { TriggerType } from '../../workflow-loop';
import type { BuilderWorkspace } from '../../workspace/builder-sandbox-factory';
import { readFileViaSandbox } from '../../workspace/sandbox-fs';
import { getWorkspaceRoot } from '../../workspace/sandbox-setup';
import {
	createSubmitWorkflowTool,
	type CredentialMap,
	type SubmitWorkflowAttempt,
} from '../workflows/submit-workflow.tool';

/** Node types that can be tested via run-workflow with inputData. */
const TESTABLE_TRIGGERS = new Set([
	'n8n-nodes-base.manualTrigger',
	'n8n-nodes-base.executeWorkflowTrigger',
]);

const BUILDER_MAX_STEPS = 30;

interface BuilderReportedResult {
	status: 'verified' | 'blocked' | 'failed';
	workflowId?: string;
	reason?: string;
	summary?: string;
}

export interface StartBuildWorkflowAgentTaskInput {
	task: string;
	workflowId?: string;
	planId?: string;
	phaseId?: string;
}

function createReportBuildResultTool(onReport: (result: BuilderReportedResult) => void) {
	return createTool({
		id: 'report-build-result',
		description:
			'Report the final workflow build status after submit and verification. Call exactly once before finishing.',
		inputSchema: z.object({
			status: z.enum(['verified', 'blocked', 'failed']),
			workflowId: z.string().optional(),
			reason: z.string().optional(),
			summary: z.string().optional(),
		}),
		outputSchema: z.object({
			recorded: z.boolean(),
		}),
		execute: async (input) => {
			onReport(input);
			await Promise.resolve();
			return {
				recorded: true,
			};
		},
	});
}

function detectTriggerType(attempt: SubmitWorkflowAttempt | undefined): TriggerType {
	if (!attempt?.triggerNodeTypes || attempt.triggerNodeTypes.length === 0) {
		return 'manual_or_testable';
	}
	const hasTestable = attempt.triggerNodeTypes.some((t) => TESTABLE_TRIGGERS.has(t));
	return hasTestable ? 'manual_or_testable' : 'trigger_only';
}

function hashContent(content: string | null): string {
	return createHash('sha256')
		.update(content ?? '', 'utf8')
		.digest('hex');
}

function buildOutcome(
	workItemId: string,
	taskId: string,
	attempt: SubmitWorkflowAttempt | undefined,
	finalText: string,
	reportedResult: BuilderReportedResult | null,
	planId?: string,
	phaseId?: string,
): InstanceAiWorkflowBuildTaskOutcome {
	if (!attempt && reportedResult) {
		return {
			kind: 'workflow-build',
			workItemId,
			taskId,
			...(planId ? { planId } : {}),
			...(phaseId ? { phaseId } : {}),
			...(reportedResult.workflowId ? { workflowId: reportedResult.workflowId } : {}),
			submitted: !!reportedResult.workflowId,
			verified: reportedResult.status === 'verified',
			triggerType: 'manual_or_testable',
			needsUserInput: reportedResult.status === 'blocked',
			failureSignature: reportedResult.status === 'failed' ? reportedResult.reason : undefined,
			failureReason:
				reportedResult.status === 'verified' ? undefined : (reportedResult.reason ?? finalText),
			summary: reportedResult.summary ?? finalText,
		};
	}

	if (!attempt?.success) {
		return {
			kind: 'workflow-build',
			workItemId,
			taskId,
			...(planId ? { planId } : {}),
			...(phaseId ? { phaseId } : {}),
			submitted: false,
			verified: false,
			triggerType: 'manual_or_testable',
			needsUserInput: false,
			failureSignature: attempt?.errors?.join('; '),
			failureReason: finalText,
			summary: finalText,
		};
	}

	if (reportedResult?.status === 'blocked') {
		return {
			kind: 'workflow-build',
			workItemId,
			taskId,
			...(planId ? { planId } : {}),
			...(phaseId ? { phaseId } : {}),
			workflowId: reportedResult.workflowId ?? attempt.workflowId,
			submitted: true,
			verified: false,
			triggerType: detectTriggerType(attempt),
			needsUserInput: true,
			failureReason: reportedResult.reason,
			summary: reportedResult.summary ?? finalText,
			mockedNodeNames: attempt.mockedNodeNames,
			mockedCredentialTypes: attempt.mockedCredentialTypes,
		};
	}

	if (reportedResult?.status === 'failed') {
		return {
			kind: 'workflow-build',
			workItemId,
			taskId,
			...(planId ? { planId } : {}),
			...(phaseId ? { phaseId } : {}),
			workflowId: reportedResult.workflowId ?? attempt.workflowId,
			submitted: true,
			verified: false,
			triggerType: detectTriggerType(attempt),
			needsUserInput: false,
			failureSignature: reportedResult.reason,
			failureReason: reportedResult.reason,
			summary: reportedResult.summary ?? finalText,
			mockedNodeNames: attempt.mockedNodeNames,
			mockedCredentialTypes: attempt.mockedCredentialTypes,
		};
	}

	const verified =
		reportedResult?.status === 'verified' || detectTriggerType(attempt) === 'trigger_only';

	return {
		kind: 'workflow-build',
		workItemId,
		taskId,
		...(planId ? { planId } : {}),
		...(phaseId ? { phaseId } : {}),
		workflowId: reportedResult?.workflowId ?? attempt.workflowId,
		submitted: true,
		verified,
		triggerType: detectTriggerType(attempt),
		needsUserInput: false,
		mockedNodeNames: attempt.mockedNodeNames,
		mockedCredentialTypes: attempt.mockedCredentialTypes,
		summary: reportedResult?.summary ?? finalText,
	};
}

export async function startBuildWorkflowAgentTask(
	context: OrchestrationContext,
	input: StartBuildWorkflowAgentTaskInput,
): Promise<{ started: boolean; reused: boolean; result: string; taskId?: string }> {
	if (!context.spawnBackgroundTask) {
		return {
			started: false,
			reused: false,
			result: 'Error: background task support not available.',
		};
	}

	const factory = context.builderSandboxFactory;
	const domainContext = context.domainContext;
	const useSandbox = !!factory && !!domainContext;

	let builderTools: ToolsInput;
	let prompt: string;
	let credMap: CredentialMap | undefined;

	if (useSandbox) {
		credMap = new Map();
		try {
			const allCreds = await domainContext.credentialService.list();
			for (const cred of allCreds) {
				credMap.set(cred.type, { id: cred.id, name: cred.name });
			}
		} catch {
			// Non-fatal — credentials will be unresolved (user adds in UI)
		}

		const sandboxToolNames = [
			'search-nodes',
			'get-suggested-nodes',
			'get-workflow-as-code',
			'get-node-type-definition',
			'explore-node-resources',
			'list-credentials',
			'test-credential',
			'run-workflow',
			'get-execution',
			'debug-execution',
			'activate-workflow',
			'list-data-tables',
			'create-data-table',
			'get-data-table-schema',
			'add-data-table-column',
			'query-data-table-rows',
			'insert-data-table-rows',
		];

		builderTools = {};
		for (const name of sandboxToolNames) {
			if (context.domainTools[name]) {
				builderTools[name] = context.domainTools[name];
			}
		}
		prompt = SANDBOX_BUILDER_AGENT_PROMPT;
	} else {
		builderTools = {};
		const toolNames = [
			'build-workflow',
			'get-node-type-definition',
			'get-workflow-as-code',
			'search-nodes',
			'get-suggested-nodes',
			'run-workflow',
			'get-execution',
			'debug-execution',
			'activate-workflow',
			'list-data-tables',
			'create-data-table',
			'get-data-table-schema',
			'add-data-table-column',
			'query-data-table-rows',
			'insert-data-table-rows',
			...(context.researchMode ? ['web-search', 'fetch-url'] : []),
		];
		for (const name of toolNames) {
			if (name in context.domainTools) {
				builderTools[name] = context.domainTools[name];
			}
		}

		if (!builderTools['build-workflow']) {
			return {
				started: false,
				reused: false,
				result: 'Error: build-workflow tool not available.',
			};
		}

		prompt = BUILDER_AGENT_PROMPT;
	}

	const builderMemory = createSubAgentMemory(context.storage, 'workflow-builder');
	const subAgentId = `agent-builder-${nanoid(6)}`;
	const taskId = `build-${nanoid(8)}`;
	const workItemId = `wi_${nanoid(8)}`;
	const executionKey = createBackgroundTaskExecutionKey({
		kind: 'workflow-build',
		planId: input.planId,
		phaseId: input.phaseId,
		targetId: input.workflowId,
		goal: input.task,
	});

	const { workflowId } = input;
	const phaseExecution = {
		...(input.planId ? { planId: input.planId } : {}),
		...(input.phaseId ? { phaseId: input.phaseId } : {}),
	};

	let iterationContext = '';
	if (context.iterationLog) {
		const taskKey = `build:${workflowId ?? 'new'}`;
		try {
			const entries = await context.iterationLog.getForTask(context.threadId, taskKey);
			iterationContext = formatPreviousAttempts(entries);
		} catch {
			// Non-fatal — iteration log is best-effort
		}
	}

	const briefing = workflowId
		? `${input.task}\n\n[CONTEXT: Modifying existing workflow ${workflowId}. The current code is pre-loaded in ~/workspace/src/workflow.ts — read it first, then edit. Use workflowId "${workflowId}" when calling submit-workflow.]${iterationContext ? `\n\n${iterationContext}` : ''}`
		: `${input.task}${iterationContext ? `\n\n${iterationContext}` : ''}`;

	const spawnResult = context.spawnBackgroundTask({
		taskId,
		threadId: context.threadId,
		agentId: subAgentId,
		role: 'workflow-builder',
		kind: 'workflow-build',
		executionKey,
		title: 'Building workflow',
		subtitle: truncateLabel(input.task),
		goal: input.task,
		targetResource: {
			type: 'workflow',
			...(input.workflowId ? { id: input.workflowId } : {}),
		},
		workItemId,
		planId: input.planId,
		phaseId: input.phaseId,
		messageGroupId: context.messageGroupId,
		run: async (signal, drainCorrections, lifecycle): Promise<BackgroundTaskResult> => {
			let builderWs: BuilderWorkspace | undefined;
			const submitAttempts = new Map<string, SubmitWorkflowAttempt>();
			let reportedResult: BuilderReportedResult | null = null;

			try {
				if (useSandbox && factory && domainContext) {
					builderWs = await factory.create(subAgentId, domainContext);
					const workspace = builderWs.workspace;

					if (workflowId) {
						try {
							const json = await domainContext.workflowService.getAsWorkflowJSON(workflowId);
							let rawCode = generateWorkflowCode(json);
							rawCode = rawCode.replace(
								/newCredential\('([^']*)',\s*'[^']*'\)/g,
								"newCredential('$1')",
							);
							const code = `${SDK_IMPORT_STATEMENT}\n\n${rawCode}`;
							const root = await getWorkspaceRoot(workspace);
							if (workspace.filesystem) {
								await workspace.filesystem.writeFile(`${root}/src/workflow.ts`, code, {
									recursive: true,
								});
							}
						} catch {
							// Non-fatal — agent can still build from scratch
						}
					}

					builderTools['submit-workflow'] = createSubmitWorkflowTool(
						domainContext,
						workspace,
						credMap,
						(attempt) => {
							submitAttempts.set(attempt.filePath, attempt);
						},
					);
					builderTools['report-build-result'] = createReportBuildResultTool((result) => {
						reportedResult = result;
					});

					const subAgent = new Agent({
						id: subAgentId,
						name: 'Workflow Builder Agent',
						instructions: {
							role: 'system' as const,
							content: prompt,
							providerOptions: {
								anthropic: { cacheControl: { type: 'ephemeral' } },
							},
						},
						model: context.modelId,
						tools: builderTools,
						workspace,
						memory: builderMemory,
					});

					registerWithMastra(subAgentId, subAgent, context.storage);

					const builderMemoryOpts = builderMemory
						? {
								resource: subAgentResourceId(context.userId, 'workflow-builder'),
								thread: subAgentId,
							}
						: undefined;

					const stream = await subAgent.stream(briefing, {
						maxSteps: BUILDER_MAX_STEPS,
						abortSignal: signal,
						providerOptions: {
							anthropic: { cacheControl: { type: 'ephemeral' } },
						},
						...(builderMemoryOpts ? { memory: builderMemoryOpts } : {}),
					});

					const hitlResult = await consumeStreamWithHitl({
						agent: subAgent,
						stream: stream as {
							runId?: string;
							fullStream: AsyncIterable<unknown>;
							text: Promise<string>;
						},
						runId: context.runId,
						agentId: subAgentId,
						eventBus: context.eventBus,
						threadId: context.threadId,
						abortSignal: signal,
						waitForConfirmation: context.waitForConfirmation,
						drainCorrections,
						onSuspended: async (suspension) => await lifecycle.suspended(suspension.requestId),
						onResumed: async () => await lifecycle.resumed(),
					});

					const finalText = await hitlResult.text;
					const root = await getWorkspaceRoot(workspace);
					const mainWorkflowPath = `${root}/src/workflow.ts`;
					const mainWorkflowAttempt = submitAttempts.get(mainWorkflowPath);
					const currentMainWorkflow = await readFileViaSandbox(workspace, mainWorkflowPath);
					const currentMainWorkflowHash = hashContent(currentMainWorkflow);

					if (!mainWorkflowAttempt) {
						const text = 'Error: workflow builder finished without submitting /src/workflow.ts.';
						return {
							text,
							outcome: buildOutcome(
								workItemId,
								taskId,
								undefined,
								text,
								reportedResult,
								phaseExecution.planId,
								phaseExecution.phaseId,
							),
						};
					}

					if (!mainWorkflowAttempt.success) {
						const errorText =
							mainWorkflowAttempt.errors?.join(' ') ?? 'Unknown submit-workflow failure.';
						const text = `Error: workflow builder stopped after a failed submit-workflow for /src/workflow.ts. ${errorText}`;
						return {
							text,
							outcome: buildOutcome(
								workItemId,
								taskId,
								mainWorkflowAttempt,
								text,
								reportedResult,
								phaseExecution.planId,
								phaseExecution.phaseId,
							),
						};
					}

					if (mainWorkflowAttempt.sourceHash !== currentMainWorkflowHash) {
						const text =
							'Error: workflow builder edited /src/workflow.ts after the last submit-workflow call. It must re-submit the workflow before finishing.';
						return {
							text,
							outcome: buildOutcome(
								workItemId,
								taskId,
								undefined,
								text,
								reportedResult,
								phaseExecution.planId,
								phaseExecution.phaseId,
							),
						};
					}

					return {
						text: finalText,
						outcome: buildOutcome(
							workItemId,
							taskId,
							mainWorkflowAttempt,
							finalText,
							reportedResult,
							phaseExecution.planId,
							phaseExecution.phaseId,
						),
					};
				}

				builderTools['report-build-result'] = createReportBuildResultTool((result) => {
					reportedResult = result;
				});

				const subAgent = new Agent({
					id: subAgentId,
					name: 'Workflow Builder Agent',
					instructions: {
						role: 'system' as const,
						content: prompt,
						providerOptions: {
							anthropic: { cacheControl: { type: 'ephemeral' } },
						},
					},
					model: context.modelId,
					tools: builderTools,
					memory: builderMemory,
				});

				registerWithMastra(subAgentId, subAgent, context.storage);

				const toolMemoryOpts = builderMemory
					? {
							resource: subAgentResourceId(context.userId, 'workflow-builder'),
							thread: subAgentId,
						}
					: undefined;

				const stream = await subAgent.stream(briefing, {
					maxSteps: BUILDER_MAX_STEPS,
					abortSignal: signal,
					providerOptions: {
						anthropic: { cacheControl: { type: 'ephemeral' } },
					},
					...(toolMemoryOpts ? { memory: toolMemoryOpts } : {}),
				});

				const hitlResult = await consumeStreamWithHitl({
					agent: subAgent,
					stream: stream as {
						runId?: string;
						fullStream: AsyncIterable<unknown>;
						text: Promise<string>;
					},
					runId: context.runId,
					agentId: subAgentId,
					eventBus: context.eventBus,
					threadId: context.threadId,
					abortSignal: signal,
					waitForConfirmation: context.waitForConfirmation,
					drainCorrections,
					onSuspended: async (suspension) => await lifecycle.suspended(suspension.requestId),
					onResumed: async () => await lifecycle.resumed(),
				});

				const finalText = await hitlResult.text;
				return {
					text: finalText,
					outcome: buildOutcome(
						workItemId,
						taskId,
						undefined,
						finalText,
						reportedResult,
						phaseExecution.planId,
						phaseExecution.phaseId,
					),
				};
			} finally {
				await builderWs?.cleanup();
			}
		},
	});

	if (!spawnResult.started) {
		return {
			started: false,
			reused: false,
			result: spawnResult.error ?? 'Error: failed to start workflow build.',
		};
	}

	if (!spawnResult.reused) {
		context.eventBus.publish(context.threadId, {
			type: 'agent-spawned',
			runId: context.runId,
			agentId: subAgentId,
			payload: {
				parentId: context.orchestratorAgentId,
				role: 'workflow-builder',
				tools: Object.keys(builderTools),
				taskId: spawnResult.taskId,
				kind: 'builder',
				title: 'Building workflow',
				subtitle: truncateLabel(input.task),
				goal: input.task,
				targetResource: input.workflowId
					? { type: 'workflow' as const, id: input.workflowId }
					: { type: 'workflow' as const },
			},
		});
	}

	return {
		started: true,
		reused: spawnResult.reused,
		result: spawnResult.reused
			? `Workflow build already running (task: ${spawnResult.taskId}). Acknowledge briefly and move on.`
			: `Workflow build started (task: ${spawnResult.taskId}). Acknowledge briefly and move on.`,
		taskId: spawnResult.taskId,
	};
}

export function createBuildWorkflowAgentTool(context: OrchestrationContext) {
	return createTool({
		id: 'build-workflow-with-agent',
		description:
			'Build or modify an n8n workflow using a specialized builder agent. ' +
			'The agent handles node discovery, schema lookups, code generation, ' +
			'and validation internally.',
		inputSchema: z.object({
			task: z
				.string()
				.describe(
					'What to build and any context: user requirements, available credential names/types.',
				),
			workflowId: z
				.string()
				.optional()
				.describe(
					'Existing workflow ID to modify. When provided, the agent starts with the current workflow code pre-loaded.',
				),
			planId: z.string().optional().describe('Plan ID for phase-aware execution updates.'),
			phaseId: z
				.string()
				.optional()
				.describe('Phase ID in the current plan that this build belongs to.'),
		}),
		outputSchema: z.object({
			started: z.boolean(),
			reused: z.boolean(),
			result: z.string(),
			taskId: z.string().optional(),
		}),
		execute: async (input) => {
			return await startBuildWorkflowAgentTask(context, input);
		},
	});
}
