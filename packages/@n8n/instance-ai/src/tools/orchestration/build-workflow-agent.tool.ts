/**
 * Preconfigured Workflow Builder Agent Tool
 *
 * Creates a focused sub-agent that writes TypeScript SDK code and validates it.
 * Two modes:
 * - Sandbox mode (when workspace is available): agent works with real files + tsc
 * - Tool mode (fallback): agent uses build-workflow tool with string-based code
 */

import { Agent } from '@mastra/core/agent';
import type { ToolsInput } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { generateWorkflowCode } from '@n8n/workflow-sdk';
import { nanoid } from 'nanoid';
import { createHash } from 'node:crypto';
import { z } from 'zod';

import {
	BUILDER_AGENT_PROMPT,
	createSandboxBuilderAgentPrompt,
} from './build-workflow-agent.prompt';
import { truncateLabel } from './display-utils';
import {
	createDetachedSubAgentTracing,
	traceSubAgentTools,
	withTraceContextActor,
} from './tracing-utils';
import { createVerifyBuiltWorkflowTool } from './verify-built-workflow.tool';
import { registerWithMastra } from '../../agent/register-with-mastra';
import { buildSubAgentBriefing } from '../../agent/sub-agent-briefing';
import { MAX_STEPS } from '../../constants/max-steps';
import { createLlmStepTraceHooks } from '../../runtime/resumable-stream-executor';
import { consumeStreamWithHitl } from '../../stream/consume-with-hitl';
import {
	buildAgentTraceInputs,
	getTraceParentRun,
	mergeTraceRunInputs,
	withTraceParentContext,
} from '../../tracing/langsmith-tracing';
import type { BackgroundTaskResult, OrchestrationContext } from '../../types';
import { SDK_IMPORT_STATEMENT } from '../../workflow-builder/extract-code';
import type { TriggerType, WorkflowBuildOutcome } from '../../workflow-loop';
import type { BuilderWorkspace } from '../../workspace/builder-sandbox-factory';
import { readFileViaSandbox } from '../../workspace/sandbox-fs';
import { getWorkspaceRoot } from '../../workspace/sandbox-setup';
import { buildCredentialMap, type CredentialMap } from '../workflows/resolve-credentials';
import { createIdentityEnforcedSubmitWorkflowTool } from '../workflows/submit-workflow-identity';
import { type SubmitWorkflowAttempt } from '../workflows/submit-workflow.tool';

/** Trigger types that cannot be test-fired programmatically (need an external request). */
const UNTESTABLE_TRIGGERS = new Set([
	'n8n-nodes-base.webhook',
	'n8n-nodes-base.formTrigger',
	'@n8n/n8n-nodes-langchain.mcpTrigger',
	'@n8n/n8n-nodes-langchain.chatTrigger',
]);

/** Human-readable label derived from a node type string, e.g. "n8n-nodes-base.formTrigger" → "form" */
function triggerLabel(nodeType: string): string {
	const short = nodeType.split('.').pop() ?? nodeType;
	return short.replace(/Trigger$/i, '').toLowerCase() || short.toLowerCase();
}

const UNTESTABLE_TRIGGER_LABELS = [...UNTESTABLE_TRIGGERS].map(triggerLabel).join(', ');

function detectTriggerType(attempt: SubmitWorkflowAttempt | undefined): TriggerType {
	if (!attempt?.triggerNodeTypes || attempt.triggerNodeTypes.length === 0) {
		return 'manual_or_testable';
	}
	const allUntestable = attempt.triggerNodeTypes.every((t) => UNTESTABLE_TRIGGERS.has(t));
	return allUntestable ? 'trigger_only' : 'manual_or_testable';
}

function buildOutcome(
	workItemId: string,
	taskId: string,
	attempt: SubmitWorkflowAttempt | undefined,
	finalText: string,
): WorkflowBuildOutcome {
	if (!attempt?.success) {
		return {
			workItemId,
			taskId,
			submitted: false,
			triggerType: 'manual_or_testable',
			needsUserInput: false,
			failureSignature: attempt?.errors?.join('; '),
			summary: finalText,
		};
	}
	return {
		workItemId,
		taskId,
		workflowId: attempt.workflowId,
		submitted: true,
		triggerType: attempt.hasUnresolvedPlaceholders ? 'trigger_only' : detectTriggerType(attempt),
		needsUserInput: false,
		mockedNodeNames: attempt.mockedNodeNames,
		mockedCredentialTypes: attempt.mockedCredentialTypes,
		mockedCredentialsByNode: attempt.mockedCredentialsByNode,
		verificationPinData: attempt.verificationPinData,
		hasUnresolvedPlaceholders: attempt.hasUnresolvedPlaceholders,
		summary: finalText,
	};
}

const DETACHED_BUILDER_REQUIREMENTS = `## Detached Task Contract

You are running as a detached background task. Do not stop after a successful submit — verify the workflow works.

### Completion criteria

Your job is done when ONE of these is true:
- the workflow is verified (ran successfully)
- the workflow uses only event triggers (${UNTESTABLE_TRIGGER_LABELS}) and cannot be runtime-tested — stop after a successful submit. Do NOT publish it; the orchestrator will handle setup and publishing.
- you are blocked after one repair attempt per unique failure

### Submit discipline

**Every file edit MUST be followed by submit-workflow before you do anything else.**
The system tracks file hashes. If you edit the code and then call \`executions(action="run")\` or finish without re-submitting, your work is discarded. The sequence is always: edit → submit → then verify/run.

### Verification

- If submit-workflow returned mocked credentials, call verify-built-workflow with the workItemId
- Otherwise call \`executions(action="run")\` to test (skip for trigger-only workflows). For event-based triggers (Linear, GitHub, Slack, etc.), pass \`inputData\` with sample data matching the trigger's expected output shape — the system injects it as the trigger node's output.
- If verification fails, call \`executions(action="debug")\`, fix the code, re-submit, and retry once
- If the same failure signature repeats, stop and explain the block

### Resource discovery

Before writing code that uses external services, **resolve real resource IDs**:
- Call \`nodes(action="explore-resources")\` for any parameter with searchListMethod (calendars, spreadsheets, channels, models, etc.)
- Do NOT use "primary", "default", or any assumed identifier — look up the actual value
- Call \`nodes(action="suggested")\` early if the workflow fits a known category (web_app, form_input, data_persistence, etc.) — the pattern hints prevent common mistakes
- Check @builderHint annotations in node type definitions for critical configuration guidance

### Publishing

Do NOT call \`workflows(action="publish")\` for the main workflow. Publishing is the user's decision after testing. Your job ends at a successful submit. The only exception is sub-workflows in the compositional pattern — those must be published so the parent workflow can reference them.
`;

function hashContent(content: string | null): string {
	return createHash('sha256')
		.update(content ?? '', 'utf8')
		.digest('hex');
}

/**
 * When the builder's stream errors mid-run, recover a successful-submit outcome
 * from the submit-attempt history so the orchestrator doesn't redo a build that
 * already produced a workflow. Scans in reverse so a later failed submit for
 * the main path cannot mask an earlier success. Returns undefined when nothing
 * was successfully submitted yet — the caller should rethrow in that case.
 */
export function resultFromPostStreamError(input: {
	error: unknown;
	submitAttempts: SubmitWorkflowAttempt[];
	mainWorkflowPath: string;
	workItemId: string;
	taskId: string;
}): BackgroundTaskResult | undefined {
	let attempt: SubmitWorkflowAttempt | undefined;
	for (let i = input.submitAttempts.length - 1; i >= 0; i--) {
		const a = input.submitAttempts[i];
		if (a.filePath === input.mainWorkflowPath && a.success) {
			attempt = a;
			break;
		}
	}
	if (!attempt) return undefined;

	const errorText = input.error instanceof Error ? input.error.message : String(input.error);
	const text = `Workflow ${attempt.workflowId} submitted successfully. A later step failed: ${errorText}`;
	return {
		text,
		outcome: buildOutcome(input.workItemId, input.taskId, attempt, text),
	};
}

export interface StartBuildWorkflowAgentInput {
	task: string;
	workflowId?: string;
	conversationContext?: string;
	taskId?: string;
	agentId?: string;
	plannedTaskId?: string;
}

export interface StartedWorkflowBuildTask {
	result: string;
	taskId: string;
	agentId: string;
}

export async function startBuildWorkflowAgentTask(
	context: OrchestrationContext,
	input: StartBuildWorkflowAgentInput,
): Promise<StartedWorkflowBuildTask> {
	if (!context.spawnBackgroundTask) {
		return {
			result: 'Error: background task support not available.',
			taskId: '',
			agentId: '',
		};
	}

	const factory = context.builderSandboxFactory;
	const domainContext = context.domainContext;
	const useSandbox = !!factory && !!domainContext;

	let builderTools: ToolsInput;
	let prompt = BUILDER_AGENT_PROMPT;
	let credMap: CredentialMap | undefined;

	if (useSandbox) {
		credMap = await buildCredentialMap(domainContext.credentialService);

		const toolNames = [
			'nodes',
			'workflows',
			'credentials',
			'executions',
			'data-tables',
			'templates',
			'ask-user',
		];

		builderTools = {};
		for (const name of toolNames) {
			if (context.domainTools[name]) {
				builderTools[name] = context.domainTools[name];
			}
		}
		if (context.workflowTaskService && context.domainContext) {
			builderTools['verify-built-workflow'] = createVerifyBuiltWorkflowTool(context);
		}
	} else {
		builderTools = {};

		const toolNames = [
			'build-workflow',
			'nodes',
			'workflows',
			'data-tables',
			'templates',
			'ask-user',
			...(context.researchMode ? ['research'] : []),
		];
		for (const name of toolNames) {
			if (name in context.domainTools) {
				builderTools[name] = context.domainTools[name];
			}
		}

		if (!builderTools['build-workflow']) {
			return { result: 'Error: build-workflow tool not available.', taskId: '', agentId: '' };
		}
	}

	const subAgentId = input.agentId ?? `agent-builder-${nanoid(6)}`;
	const taskId = input.taskId ?? `build-${nanoid(8)}`;
	const workItemId = `wi_${nanoid(8)}`;

	context.eventBus.publish(context.threadId, {
		type: 'agent-spawned',
		runId: context.runId,
		agentId: subAgentId,
		payload: {
			parentId: context.orchestratorAgentId,
			role: 'workflow-builder',
			tools: Object.keys(builderTools),
			taskId,
			kind: 'builder',
			title: 'Building workflow',
			subtitle: truncateLabel(input.task),
			goal: input.task,
			targetResource: input.workflowId
				? { type: 'workflow' as const, id: input.workflowId }
				: { type: 'workflow' as const },
		},
	});

	const { workflowId } = input;

	// Build additional context based on sandbox mode and existing workflow
	let additionalContext = '';
	if (useSandbox && workflowId) {
		additionalContext = `[CONTEXT: Modifying existing workflow ${workflowId}. The current code is pre-loaded in ~/workspace/src/workflow.ts — read it first, then edit. Use workflowId "${workflowId}" when calling submit-workflow.]\n\n[WORK ITEM ID: ${workItemId}]`;
	} else if (useSandbox) {
		additionalContext = `[WORK ITEM ID: ${workItemId}]`;
	} else if (workflowId) {
		additionalContext = `[CONTEXT: Modifying existing workflow ${workflowId}. Use workflowId "${workflowId}" when calling build-workflow.]`;
	}

	const briefing = await buildSubAgentBriefing({
		task: input.task,
		conversationContext: input.conversationContext,
		additionalContext: additionalContext || undefined,
		requirements: useSandbox ? DETACHED_BUILDER_REQUIREMENTS : undefined,
		iteration: context.iterationLog
			? {
					log: context.iterationLog,
					threadId: context.threadId,
					taskKey: `build:${workflowId ?? 'new'}`,
				}
			: undefined,
		runningTasks: context.getRunningTaskSummaries?.(),
	});
	const traceContext = await createDetachedSubAgentTracing(context, {
		agentId: subAgentId,
		role: 'workflow-builder',
		kind: 'builder',
		taskId,
		plannedTaskId: input.plannedTaskId,
		workItemId,
		inputs: {
			task: input.task,
			workflowId: input.workflowId,
			conversationContext: input.conversationContext,
		},
	});

	context.spawnBackgroundTask({
		taskId,
		threadId: context.threadId,
		agentId: subAgentId,
		role: 'workflow-builder',
		traceContext,
		plannedTaskId: input.plannedTaskId,
		workItemId,
		run: async (signal, drainCorrections, waitForCorrection): Promise<BackgroundTaskResult> =>
			await withTraceContextActor(traceContext, async () => {
				let builderWs: BuilderWorkspace | undefined;
				const submitAttempts = new Map<string, SubmitWorkflowAttempt>();
				// Append-only history so a later failed submit for the main path
				// cannot mask an earlier successful submit during post-error recovery.
				const submitAttemptHistory: SubmitWorkflowAttempt[] = [];
				try {
					if (useSandbox) {
						builderWs = await factory.create(subAgentId, domainContext);
						const workspace = builderWs.workspace;
						const root = await getWorkspaceRoot(workspace);
						prompt = createSandboxBuilderAgentPrompt(root);

						if (workflowId && domainContext) {
							try {
								const json = await domainContext.workflowService.getAsWorkflowJSON(workflowId);
								let rawCode = generateWorkflowCode(json);
								// Preserve the original id so credentials stay bound across saves.
								// Stripping the id forced resolution through resolveCredentials,
								// which does last-write-wins by credential type when a user has
								// multiple credentials of the same type.
								rawCode = rawCode.replace(
									/newCredential\('([^']*)',\s*'([^']*)'\)/g,
									"{ id: '$2', name: '$1' }",
								);
								const code = `${SDK_IMPORT_STATEMENT}\n\n${rawCode}`;
								if (workspace.filesystem) {
									await workspace.filesystem.writeFile(`${root}/src/workflow.ts`, code, {
										recursive: true,
									});
								}
							} catch {
								// Non-fatal — agent can still build from scratch
							}
						}

						const mainWorkflowPath = `${root}/src/workflow.ts`;
						builderTools['submit-workflow'] = createIdentityEnforcedSubmitWorkflowTool({
							context: domainContext,
							workspace,
							credentialMap: credMap,
							root,
							onAttempt: async (attempt) => {
								submitAttempts.set(attempt.filePath, attempt);
								submitAttemptHistory.push(attempt);
								if (attempt.filePath !== mainWorkflowPath || !context.workflowTaskService) {
									return;
								}

								await context.workflowTaskService.reportBuildOutcome(
									buildOutcome(
										workItemId,
										taskId,
										attempt,
										attempt.success
											? 'Workflow submitted and ready for verification.'
											: (attempt.errors?.join(' ') ?? 'Workflow submission failed.'),
									),
								);
							},
						});

						const tracedBuilderTools = traceSubAgentTools(
							context,
							builderTools,
							'workflow-builder',
						);

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
							tools: tracedBuilderTools,
							workspace,
						});
						mergeTraceRunInputs(
							traceContext?.actorRun,
							buildAgentTraceInputs({
								systemPrompt: prompt,
								tools: tracedBuilderTools,
								modelId: context.modelId,
							}),
						);

						registerWithMastra(subAgentId, subAgent, context.storage);

						const traceParent = getTraceParentRun();
						let finalText: string;
						try {
							const hitlResult = await withTraceParentContext(traceParent, async () => {
								const llmStepTraceHooks = createLlmStepTraceHooks(traceParent);
								const stream = await subAgent.stream(briefing, {
									maxSteps: MAX_STEPS.BUILDER,
									abortSignal: signal,
									providerOptions: {
										anthropic: { cacheControl: { type: 'ephemeral' } },
									},
									...(llmStepTraceHooks?.executionOptions ?? {}),
								});

								return await consumeStreamWithHitl({
									agent: subAgent,
									stream: stream as {
										runId?: string;
										fullStream: AsyncIterable<unknown>;
										text: Promise<string>;
									},
									runId: context.runId,
									agentId: subAgentId,
									eventBus: context.eventBus,
									logger: context.logger,
									threadId: context.threadId,
									abortSignal: signal,
									waitForConfirmation: context.waitForConfirmation,
									drainCorrections,
									waitForCorrection,
									llmStepTraceHooks,
								});
							});

							finalText = await hitlResult.text;
						} catch (error) {
							const recovered = resultFromPostStreamError({
								error,
								submitAttempts: submitAttemptHistory,
								mainWorkflowPath,
								workItemId,
								taskId,
							});
							if (recovered) return recovered;
							throw error;
						}

						const mainWorkflowAttempt = submitAttempts.get(mainWorkflowPath);
						const currentMainWorkflow = await readFileViaSandbox(workspace, mainWorkflowPath);
						const currentMainWorkflowHash = hashContent(currentMainWorkflow);

						if (!mainWorkflowAttempt) {
							const text = 'Error: workflow builder finished without submitting /src/workflow.ts.';
							return {
								text,
								outcome: buildOutcome(workItemId, taskId, undefined, text),
							};
						}

						if (!mainWorkflowAttempt.success) {
							const errorText =
								mainWorkflowAttempt.errors?.join(' ') ?? 'Unknown submit-workflow failure.';
							const text = `Error: workflow builder stopped after a failed submit-workflow for /src/workflow.ts. ${errorText}`;
							return {
								text,
								outcome: buildOutcome(workItemId, taskId, mainWorkflowAttempt, text),
							};
						}

						if (mainWorkflowAttempt.sourceHash !== currentMainWorkflowHash) {
							// Builder edited the file after its last submit — auto-re-submit
							// instead of discarding the agent's work.
							const submitTool = tracedBuilderTools['submit-workflow'];
							if (submitTool && 'execute' in submitTool) {
								const resubmit = await (
									submitTool as {
										execute: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
									}
								).execute({
									filePath: mainWorkflowPath,
									workflowId: mainWorkflowAttempt.workflowId,
								});

								const refreshedAttempt = submitAttempts.get(mainWorkflowPath);
								if (refreshedAttempt?.success) {
									return {
										text: finalText,
										outcome: buildOutcome(workItemId, taskId, refreshedAttempt, finalText),
									};
								}

								const resubmitErrors =
									refreshedAttempt?.errors?.join(' ') ??
									(typeof resubmit?.errors === 'string'
										? resubmit.errors
										: 'Auto-re-submit failed.');
								const text = `Error: auto-re-submit of edited /src/workflow.ts failed. ${resubmitErrors}`;
								return {
									text,
									outcome: buildOutcome(workItemId, taskId, refreshedAttempt ?? undefined, text),
								};
							}
						}

						return {
							text: finalText,
							outcome: buildOutcome(workItemId, taskId, mainWorkflowAttempt, finalText),
						};
					}

					const tracedBuilderTools = traceSubAgentTools(context, builderTools, 'workflow-builder');

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
						tools: tracedBuilderTools,
					});
					mergeTraceRunInputs(
						traceContext?.actorRun,
						buildAgentTraceInputs({
							systemPrompt: prompt,
							tools: tracedBuilderTools,
							modelId: context.modelId,
						}),
					);

					registerWithMastra(subAgentId, subAgent, context.storage);

					const traceParent = getTraceParentRun();
					const hitlResult = await withTraceParentContext(traceParent, async () => {
						const llmStepTraceHooks = createLlmStepTraceHooks(traceParent);
						const stream = await subAgent.stream(briefing, {
							maxSteps: MAX_STEPS.BUILDER,
							abortSignal: signal,
							providerOptions: {
								anthropic: { cacheControl: { type: 'ephemeral' } },
							},
							...(llmStepTraceHooks?.executionOptions ?? {}),
						});

						return await consumeStreamWithHitl({
							agent: subAgent,
							stream: stream as {
								runId?: string;
								fullStream: AsyncIterable<unknown>;
								text: Promise<string>;
							},
							runId: context.runId,
							agentId: subAgentId,
							eventBus: context.eventBus,
							logger: context.logger,
							threadId: context.threadId,
							abortSignal: signal,
							waitForConfirmation: context.waitForConfirmation,
							drainCorrections,
							waitForCorrection,
							llmStepTraceHooks,
						});
					});

					const toolFinalText = await hitlResult.text;
					return { text: toolFinalText };
				} finally {
					await builderWs?.cleanup();
				}
			}),
	});

	return {
		result: `Workflow build started (task: ${taskId}). Reply with one short sentence — e.g. name what's being built. Do NOT summarize the plan or list details.`,
		taskId,
		agentId: subAgentId,
	};
}

export const buildWorkflowAgentInputSchema = z.object({
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
	conversationContext: z
		.string()
		.optional()
		.describe(
			'Brief summary of the conversation so far — what was discussed, decisions made, and information gathered (e.g., which credentials are available). The builder uses this to avoid repeating information the user already knows.',
		),
});

export function createBuildWorkflowAgentTool(context: OrchestrationContext) {
	return createTool({
		id: 'build-workflow-with-agent',
		description:
			'Build or modify an n8n workflow using a specialized builder agent. ' +
			'The agent handles node discovery, schema lookups, code generation, ' +
			'and validation internally.',
		inputSchema: buildWorkflowAgentInputSchema,
		outputSchema: z.object({
			result: z.string(),
			taskId: z.string(),
		}),
		execute: async (input: z.infer<typeof buildWorkflowAgentInputSchema>) => {
			const result = await startBuildWorkflowAgentTask(context, input);
			return { result: result.result, taskId: result.taskId };
		},
	});
}
