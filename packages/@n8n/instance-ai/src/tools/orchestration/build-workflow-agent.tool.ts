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

import { createBrowserCredentialSetupTool } from './browser-credential-setup.tool';
import { BUILDER_AGENT_PROMPT, SANDBOX_BUILDER_AGENT_PROMPT } from './build-workflow-agent.prompt';
import { truncateLabel } from './display-utils';
import { createVerifyBuiltWorkflowTool } from './verify-built-workflow.tool';
import { registerWithMastra } from '../../agent/register-with-mastra';
import { createSubAgentMemory, subAgentResourceId } from '../../memory/sub-agent-memory';
import { formatPreviousAttempts } from '../../storage/iteration-log';
import { consumeStreamWithHitl } from '../../stream/consume-with-hitl';
import type { BackgroundTaskResult, OrchestrationContext } from '../../types';
import { SDK_IMPORT_STATEMENT } from '../../workflow-builder/extract-code';
import type { TriggerType, WorkflowBuildOutcome } from '../../workflow-loop';
import type { BuilderWorkspace } from '../../workspace/builder-sandbox-factory';
import { readFileViaSandbox } from '../../workspace/sandbox-fs';
import { getWorkspaceRoot } from '../../workspace/sandbox-setup';
import { createApplyWorkflowCredentialsTool } from '../workflows/apply-workflow-credentials.tool';
import { buildCredentialMap, type CredentialMap } from '../workflows/resolve-credentials';
import {
	createSubmitWorkflowTool,
	type SubmitWorkflowAttempt,
} from '../workflows/submit-workflow.tool';

/** Node types that can be tested via run-workflow with inputData. */
const TESTABLE_TRIGGERS = new Set([
	'n8n-nodes-base.manualTrigger',
	'n8n-nodes-base.executeWorkflowTrigger',
]);

function detectTriggerType(attempt: SubmitWorkflowAttempt | undefined): TriggerType {
	if (!attempt?.triggerNodeTypes || attempt.triggerNodeTypes.length === 0) {
		return 'manual_or_testable';
	}
	const hasTestable = attempt.triggerNodeTypes.some((t) => TESTABLE_TRIGGERS.has(t));
	return hasTestable ? 'manual_or_testable' : 'trigger_only';
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
		triggerType: detectTriggerType(attempt),
		needsUserInput: false,
		mockedNodeNames: attempt.mockedNodeNames,
		mockedCredentialTypes: attempt.mockedCredentialTypes,
		mockedCredentialsByNode: attempt.mockedCredentialsByNode,
		verificationPinData: attempt.verificationPinData,
		summary: finalText,
	};
}

const BUILDER_MAX_STEPS = 30;

const DETACHED_BUILDER_REQUIREMENTS = `## Detached Task Contract

You are running as a detached background task. Do not stop after a successful submit.

Your job is only complete when one of these is true:
- the main workflow in ~/workspace/src/workflow.ts is verified successfully
- the workflow is trigger-only and cannot be runtime-tested
- you are blocked on user input after exhausting one repair attempt per unique failure signature

Rules:
- Always keep working on the same main workflow file. For fixes, start from the latest submitted code.
- After each fix, submit the main workflow again before doing anything else.
- Verify the final workflow before finishing:
  - if submit-workflow returned mocked credentials, use verify-built-workflow with the provided workItemId
  - otherwise use run-workflow directly
- If verification fails, use debug-execution, repair the workflow, re-submit, and retry.
- Only do one automatic repair per unique failure signature. If the same failure repeats, stop and explain the block clearly.
- If verification succeeds with mocked credentials, finalize the workflow before finishing:
  - call setup-credentials with credentialFlow stage "finalize"
  - if it returns needsBrowserSetup=true and browser-credential-setup is available, call browser-credential-setup and then setup-credentials again
  - call apply-workflow-credentials with the provided workItemId and the selected credentials
- Use ask-user if you truly need human input that tools cannot resolve.
`;

function hashContent(content: string | null): string {
	return createHash('sha256')
		.update(content ?? '', 'utf8')
		.digest('hex');
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
		}),
		outputSchema: z.object({
			result: z.string(),
			taskId: z.string(),
		}),
		execute: async (input) => {
			if (!context.spawnBackgroundTask) {
				return { result: 'Error: background task support not available.', taskId: '' };
			}

			const factory = context.builderSandboxFactory;
			const domainContext = context.domainContext;
			const useSandbox = !!factory && !!domainContext;

			// Build the appropriate tool set based on mode
			let builderTools: ToolsInput;
			let prompt: string;

			// Build credential map outside run: (doesn't need sandbox)
			let credMap: CredentialMap | undefined;

			if (useSandbox) {
				credMap = await buildCredentialMap(domainContext.credentialService);

				const toolNames = [
					// Full build/rebuild mode: node discovery, credential/execution tools
					// submit-workflow is created per-builder inside run: (needs the builder's workspace)
					'search-nodes',
					'get-suggested-nodes',
					'get-workflow-as-code',
					'get-node-type-definition',
					'explore-node-resources',
					'list-workflows',
					'list-credentials',
					'test-credential',
					'setup-credentials',
					'ask-user',
					'run-workflow',
					'get-execution',
					'debug-execution',
					'publish-workflow',
					'unpublish-workflow',
					'list-data-tables',
					'create-data-table',
					'get-data-table-schema',
					'add-data-table-column',
					'query-data-table-rows',
					'insert-data-table-rows',
				];

				builderTools = {};
				for (const name of toolNames) {
					if (context.domainTools[name]) {
						builderTools[name] = context.domainTools[name];
					}
				}
				if (context.workflowTaskService && context.domainContext) {
					builderTools['verify-built-workflow'] = createVerifyBuiltWorkflowTool(context);
					builderTools['apply-workflow-credentials'] = createApplyWorkflowCredentialsTool(context);
				}
				if (context.browserMcpConfig) {
					builderTools['browser-credential-setup'] = createBrowserCredentialSetupTool(context);
				}
				prompt = SANDBOX_BUILDER_AGENT_PROMPT;
			} else {
				// Tool mode: original approach (no sandbox)
				builderTools = {};

				const toolNames = [
					'build-workflow',
					'get-node-type-definition',
					'get-workflow-as-code',
					'list-workflows',
					'search-nodes',
					'get-suggested-nodes',
					'ask-user',
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
					return { result: 'Error: build-workflow tool not available.', taskId: '' };
				}

				prompt = BUILDER_AGENT_PROMPT;
			}

			const builderMemory = createSubAgentMemory(context.storage, 'workflow-builder');

			const subAgentId = `agent-builder-${nanoid(6)}`;
			const taskId = `build-${nanoid(8)}`;
			const workItemId = `wi_${nanoid(8)}`;

			// Publish agent-spawned so the UI shows the builder agent immediately
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

			// Inject iteration history so retries are informed by previous attempts
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

			let briefing: string;
			if (useSandbox) {
				if (workflowId) {
					briefing = `${input.task}\n\n[CONTEXT: Modifying existing workflow ${workflowId}. The current code is pre-loaded in ~/workspace/src/workflow.ts — read it first, then edit. Use workflowId "${workflowId}" when calling submit-workflow.]\n\n[WORK ITEM ID: ${workItemId}]\n\n${DETACHED_BUILDER_REQUIREMENTS}${iterationContext ? `\n\n${iterationContext}` : ''}`;
				} else {
					briefing = `${input.task}\n\n[WORK ITEM ID: ${workItemId}]\n\n${DETACHED_BUILDER_REQUIREMENTS}${iterationContext ? `\n\n${iterationContext}` : ''}`;
				}
			} else if (workflowId) {
				briefing = `${input.task}\n\n[CONTEXT: Modifying existing workflow ${workflowId}. Use workflowId "${workflowId}" when calling build-workflow.]${iterationContext ? `\n\n${iterationContext}` : ''}`;
			} else {
				briefing = `${input.task}${iterationContext ? `\n\n${iterationContext}` : ''}`;
			}

			// Spawn builder as a background task — returns immediately
			context.spawnBackgroundTask({
				taskId,
				threadId: context.threadId,
				agentId: subAgentId,
				role: 'workflow-builder',
				workItemId,
				run: async (signal, drainCorrections): Promise<BackgroundTaskResult> => {
					let builderWs: BuilderWorkspace | undefined;
					const submitAttempts = new Map<string, SubmitWorkflowAttempt>();
					try {
						// Per-builder sandbox: each builder gets its own isolated workspace
						if (useSandbox) {
							const tFactory = performance.now();
							builderWs = await factory.create(subAgentId, domainContext);
							console.log(
								`[build-workflow-agent] factory.create took ${(performance.now() - tFactory).toFixed(0)}ms (${subAgentId})`,
							);
							const workspace = builderWs.workspace;
							const root = await getWorkspaceRoot(workspace);

							// Pre-load existing workflow code into this builder's workspace
							if (workflowId && domainContext) {
								const tPreload = performance.now();
								try {
									const json = await domainContext.workflowService.getAsWorkflowJSON(workflowId);
									let rawCode = generateWorkflowCode(json);
									// Strip credential IDs from roundtripped code: newCredential('name', 'id') → newCredential('name')
									rawCode = rawCode.replace(
										/newCredential\('([^']*)',\s*'[^']*'\)/g,
										"newCredential('$1')",
									);
									// generateWorkflowCode omits imports — prepend the SDK import statement
									const code = `${SDK_IMPORT_STATEMENT}\n\n${rawCode}`;
									if (workspace.filesystem) {
										await workspace.filesystem.writeFile(`${root}/src/workflow.ts`, code, {
											recursive: true,
										});
									}
									console.log(
										`[build-workflow-agent] pre-load workflow code took ${(performance.now() - tPreload).toFixed(0)}ms (${subAgentId})`,
									);
								} catch {
									// Non-fatal — agent can still build from scratch
								}
							}

							const mainWorkflowPath = `${root}/src/workflow.ts`;
							builderTools['submit-workflow'] = createSubmitWorkflowTool(
								domainContext,
								workspace,
								credMap,
								async (attempt) => {
									submitAttempts.set(attempt.filePath, attempt);
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

							const maxSteps = BUILDER_MAX_STEPS;

							const stream = await subAgent.stream(briefing, {
								maxSteps,
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
							});

							const finalText = await hitlResult.text;

							const mainWorkflowAttempt = submitAttempts.get(mainWorkflowPath);
							const currentMainWorkflow = await readFileViaSandbox(workspace, mainWorkflowPath);
							const currentMainWorkflowHash = hashContent(currentMainWorkflow);

							if (!mainWorkflowAttempt) {
								const text =
									'Error: workflow builder finished without submitting /src/workflow.ts.';
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
								const text =
									'Error: workflow builder edited /src/workflow.ts after the last submit-workflow call. It must re-submit the workflow before finishing.';
								return {
									text,
									outcome: buildOutcome(workItemId, taskId, undefined, text),
								};
							}

							return {
								text: finalText,
								outcome: buildOutcome(workItemId, taskId, mainWorkflowAttempt, finalText),
							};
						}

						// Tool mode (no sandbox) — original approach
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

						const maxSteps = BUILDER_MAX_STEPS;

						const stream = await subAgent.stream(briefing, {
							maxSteps,
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
						});

						const toolFinalText = await hitlResult.text;
						// Tool mode has no submit tracking — return text only
						return { text: toolFinalText };
					} finally {
						await builderWs?.cleanup();
					}
				},
			});

			return {
				result: `Workflow build started (task: ${taskId}). Acknowledge briefly and move on.`,
				taskId,
			};
		},
	});
}
