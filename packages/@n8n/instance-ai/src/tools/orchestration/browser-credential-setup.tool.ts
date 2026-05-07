import { Agent, Tool } from '@n8n/agents';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { buildNudgeStreamInput } from './browser-credential-setup.nudge';
import { buildBrowserAgentPrompt, type BrowserToolSource } from './browser-credential-setup.prompt';
import {
	createDetachedSubAgentTraceFactory,
	traceSubAgentTools,
	withTraceContextActor,
} from './tracing-utils';
import { MAX_STEPS } from '../../constants/max-steps';
import {
	executeResumableStream,
	normalizeStreamSource,
} from '../../runtime/resumable-stream-executor';
import { buildAgentTraceInputs, mergeTraceRunInputs } from '../../tracing/langsmith-tracing';
import type { InstanceAiToolRegistry, OrchestrationContext } from '../../types';
import { createToolsFromLocalMcpServer } from '../filesystem/create-tools-from-mcp-server';
import { createResearchTool } from '../research.tool';
import { createAskUserTool } from '../shared/ask-user.tool';

export { buildBrowserAgentPrompt, type BrowserToolSource } from './browser-credential-setup.prompt';

const BROWSER_CREDENTIAL_AGENT_ROLE = 'credential-setup-browser-agent';

function createPauseForUserTool() {
	return new Tool('pause-for-user')
		.description(
			'Pause and wait for the user to complete an action in the browser (e.g., sign in, ' +
				'complete 2FA, click a button, enter values privately into n8n, download files). The user sees a message and confirms when done.',
		)
		.input(browserCredentialSetupInputSchema)
		.output(
			z.object({
				continued: z.boolean(),
			}),
		)
		.suspend(
			z.object({
				requestId: z.string(),
				message: z.string(),
				severity: instanceAiConfirmationSeveritySchema,
			}),
		)
		.resume(browserCredentialSetupResumeSchema)
		.handler(async (input: z.infer<typeof browserCredentialSetupInputSchema>, ctx) => {
			const resumeData = ctx.resumeData;

			if (resumeData === undefined || resumeData === null) {
				return await ctx.suspend({
					requestId: nanoid(),
					message: input.message,
					severity: 'info' as const,
				});
			}

			return { continued: resumeData.approved };
		})
		.build();
}

export const browserCredentialSetupInputSchema = z.object({
	message: z.string().describe('What the user needs to do (shown in the chat UI)'),
});

export const browserCredentialSetupResumeSchema = z.object({
	approved: z.boolean(),
});

const browserCredentialSetupToolInputSchema = z.object({
	credentialType: z.string().describe('n8n credential type name'),
	docsUrl: z.string().optional().describe('n8n documentation URL for this credential'),
	requiredFields: z
		.array(
			z.object({
				name: z.string(),
				displayName: z.string(),
				type: z.string(),
				required: z.boolean(),
				description: z.string().optional(),
			}),
		)
		.optional()
		.describe('Credential fields the user needs to obtain from the service'),
});

type BrowserCredentialSetupToolInput = z.infer<typeof browserCredentialSetupToolInputSchema>;

function buildCredentialSetupBriefing(
	input: BrowserCredentialSetupToolInput,
	context: OrchestrationContext,
): string {
	const docsLine = input.docsUrl
		? `**Documentation:** ${input.docsUrl}`
		: '**Documentation:** No URL available — use `research` (action: web-search) to find setup instructions.';

	let fieldsSection = '';
	if (input.requiredFields && input.requiredFields.length > 0) {
		const fieldLines = input.requiredFields.map(
			(field) =>
				`- ${field.displayName} (${field.name})${field.required ? ' [REQUIRED]' : ''}${field.description ? ': ' + field.description : ''}`,
		);
		fieldsSection = `\n### Required Fields\n${fieldLines.join('\n')}`;
	}

	const isOAuth = input.credentialType.toLowerCase().includes('oauth');
	const oauthSection =
		isOAuth && context.oauth2CallbackUrl
			? `\n### OAuth Redirect URL\n${context.oauth2CallbackUrl}\n` +
				'Paste this into the "Authorized redirect URIs" field. ' +
				'Do NOT navigate to the n8n instance to find it — use this URL directly.'
			: '';

	return [
		`## Credential Setup: ${input.credentialType}`,
		'',
		docsLine,
		fieldsSection,
		oauthSection,
		'',
		'### Completion Criteria',
		'Done ONLY when all required values are visible on screen or downloaded, and you have called `pause-for-user` telling the user where to find them and to enter them privately in n8n.',
	]
		.filter(Boolean)
		.join('\n');
}

export function createBrowserCredentialSetupTool(context: OrchestrationContext) {
	return new Tool('browser-credential-setup')
		.description(
			'Run a browser agent that navigates to credential documentation and helps the user ' +
				'set up a credential on the external service. The browser is visible to the user. ' +
				'The agent can pause for user interaction (sign-in, 2FA, etc.).',
		)
		.input(browserCredentialSetupToolInputSchema)
		.output(
			z.object({
				result: z.string(),
			}),
		)
		.handler(async (input: z.infer<typeof browserCredentialSetupToolInputSchema>) => {
			await Promise.resolve();
			// Determine tool source: prefer local gateway browser tools over chrome-devtools-mcp
			const browserTools: InstanceAiToolRegistry = {};
			let toolSource: BrowserToolSource;

			const gatewayBrowserTools = context.localMcpServer?.getToolsByCategory('browser') ?? [];

			if (gatewayBrowserTools.length > 0 && context.localMcpServer) {
				// Gateway path: create native tools from gateway, keep only browser category tools
				const gatewayBrowserNames = new Set(gatewayBrowserTools.map((t) => t.name));
				const allGatewayTools = createToolsFromLocalMcpServer(
					context.localMcpServer,
					context.logger,
				);
				for (const [name, tool] of Object.entries(allGatewayTools)) {
					if (gatewayBrowserNames.has(name)) {
						browserTools[name] = tool;
					}
				}
				toolSource = 'gateway';
			} else if (context.browserMcpConfig) {
				// Chrome DevTools MCP path: use tools from context.mcpTools
				const mcpTools = context.mcpTools ?? {};
				for (const [name, tool] of Object.entries(mcpTools)) {
					browserTools[name] = tool;
				}
				toolSource = 'chrome-devtools-mcp';
			} else {
				return {
					result:
						'Browser automation is not available. Either connect a local gateway with browser tools or set N8N_INSTANCE_AI_BROWSER_MCP=true.',
				};
			}

			if (Object.keys(browserTools).length === 0) {
				return {
					result:
						toolSource === 'gateway'
							? 'Local gateway is connected but no browser_* tools are available. Ensure the browser module is enabled in the gateway.'
							: 'No browser MCP tools available. Chrome DevTools MCP may not be connected.',
				};
			}

			// Add interaction tools
			browserTools['pause-for-user'] = createPauseForUserTool();
			browserTools['ask-user'] = createAskUserTool();

			// Add consolidated research tool (web-search + fetch-url) from the domain context
			if (context.domainContext) {
				browserTools.research = createResearchTool(context.domainContext);
			}

			if (!context.spawnBackgroundTask) {
				return { result: 'Browser credential setup requires background task support.' };
			}

			const subAgentId = `agent-browser-${nanoid(6)}`;
			const taskId = `browser-credential-${nanoid(8)}`;
			const browserPrompt = buildBrowserAgentPrompt(toolSource);
			const tracedBrowserTools = traceSubAgentTools(
				context,
				browserTools,
				BROWSER_CREDENTIAL_AGENT_ROLE,
			);
			const createTraceContext = createDetachedSubAgentTraceFactory(context, {
				agentId: subAgentId,
				role: BROWSER_CREDENTIAL_AGENT_ROLE,
				kind: 'browser-credential-setup',
				taskId,
				inputs: {
					credentialType: input.credentialType,
					docsUrl: input.docsUrl,
					requiredFields: input.requiredFields?.map((field) => ({
						name: field.name,
						type: field.type,
						required: field.required,
					})),
				},
			});

			const spawnOutcome = context.spawnBackgroundTask({
				taskId,
				threadId: context.threadId,
				agentId: subAgentId,
				role: BROWSER_CREDENTIAL_AGENT_ROLE,
				createTraceContext,
				dedupeKey: { role: BROWSER_CREDENTIAL_AGENT_ROLE },
				parentCheckpointId:
					context.isCheckpointFollowUp === true ? context.checkpointTaskId : undefined,
				run: async (signal, _drainCorrections, _waitForCorrection, { traceContext }) =>
					await withTraceContextActor(traceContext, async () => {
						const subAgent = new Agent('Browser Credential Setup Agent')
							.model(context.modelId)
							.instructions(browserPrompt, {
								providerOptions: {
									anthropic: { cacheControl: { type: 'ephemeral' } },
								},
							})
							.tool(Object.values(tracedBrowserTools))
							.checkpoint(context.checkpointStore ?? 'memory');
						const telemetry = traceContext?.getTelemetry?.({
							agentRole: BROWSER_CREDENTIAL_AGENT_ROLE,
							functionId: `instance-ai.subagent.${BROWSER_CREDENTIAL_AGENT_ROLE}`,
							executionMode: 'background_subagent',
							metadata: { agent_id: subAgentId, task_id: taskId },
						});
						if (telemetry) {
							subAgent.telemetry(telemetry);
						}
						mergeTraceRunInputs(
							traceContext?.actorRun,
							buildAgentTraceInputs({
								systemPrompt: browserPrompt,
								tools: tracedBrowserTools,
								modelId: context.modelId,
							}),
						);

						const briefing = buildCredentialSetupBriefing(input, context);

						const stream = await subAgent.stream(briefing, {
							maxIterations: MAX_STEPS.BROWSER,
							abortSignal: signal,
							providerOptions: {
								anthropic: { cacheControl: { type: 'ephemeral' } },
							},
						});

						let activeStream = normalizeStreamSource(stream);
						let activeAgentRunId = typeof activeStream.runId === 'string' ? activeStream.runId : '';
						let lastSuspendedToolName = '';
						const MAX_NUDGES = 3;
						let nudgeCount = 0;

						while (true) {
							const result = await executeResumableStream({
								agent: subAgent,
								stream: activeStream,
								initialAgentRunId: activeAgentRunId,
								context: {
									threadId: context.threadId,
									runId: context.runId,
									agentId: subAgentId,
									eventBus: context.eventBus,
									signal,
									logger: context.logger,
								},
								control: {
									mode: 'auto',
									buildResumeOptions: ({ agentRunId, suspension }) => ({
										runId: agentRunId,
										toolCallId: suspension.toolCallId,
										maxIterations: MAX_STEPS.BROWSER,
									}),
									waitForConfirmation: async (requestId) => {
										if (!context.waitForConfirmation) {
											throw new Error(
												'Browser agent requires user interaction but no HITL handler is available',
											);
										}
										return await context.waitForConfirmation(requestId);
									},
									onSuspension: (suspension) => {
										lastSuspendedToolName = suspension.toolName ?? '';
									},
								},
							});

							if (result.status === 'cancelled') {
								throw new Error('Run cancelled while waiting for confirmation');
							}

							if (lastSuspendedToolName !== 'pause-for-user' && nudgeCount < MAX_NUDGES) {
								// Agent ended without a final pause-for-user confirmation.
								// Replay the prior conversation + a nudge so the sub-agent
								// has full context to finish — native `stream()` is otherwise
								// stateless across calls.
								nudgeCount++;
								const priorMessages = subAgent.getState().messageList.messages;
								const nudgeInput = buildNudgeStreamInput(priorMessages);
								const nudge = await subAgent.stream(nudgeInput, {
									maxIterations: MAX_STEPS.BROWSER,
									abortSignal: signal,
									providerOptions: {
										anthropic: { cacheControl: { type: 'ephemeral' } },
									},
								});
								activeStream = normalizeStreamSource(nudge);
								activeAgentRunId =
									(typeof activeStream.runId === 'string' && activeStream.runId) ||
									result.agentRunId ||
									activeAgentRunId;
								continue;
							}

							return await (result.text ?? activeStream.text ?? Promise.resolve(''));
						}
					}),
			});

			if (spawnOutcome.status === 'duplicate') {
				return {
					result: `Browser credential setup is already running (task: ${spawnOutcome.existing.taskId}). Wait for the background-task follow-up before dispatching another one.`,
				};
			}
			if (spawnOutcome.status === 'limit-reached') {
				return {
					result:
						'Could not start browser credential setup: concurrent background-task limit reached. Wait for an existing task to finish and try again.',
				};
			}

			context.eventBus.publish(context.threadId, {
				type: 'agent-spawned',
				runId: context.runId,
				agentId: subAgentId,
				payload: {
					parentId: context.orchestratorAgentId,
					role: BROWSER_CREDENTIAL_AGENT_ROLE,
					tools: Object.keys(browserTools),
					taskId,
					kind: 'browser-setup',
					title: 'Setting up credential',
					subtitle: input.credentialType,
					goal: `Set up ${input.credentialType}`,
					targetResource: { type: 'credential' as const },
				},
			});

			return {
				result: `Browser credential setup started (task: ${taskId}). Wait for the background-task follow-up before summarizing the result.`,
			};
		})
		.build();
}
