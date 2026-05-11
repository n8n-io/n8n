import { Agent } from '@mastra/core/agent';
import type { ToolsInput } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { buildNudgeStreamInput } from './browser-credential-setup.nudge';
import { buildBrowserAgentPrompt, type BrowserToolSource } from './browser-credential-setup.prompt';
import {
	failTraceRun,
	finishTraceRun,
	startSubAgentTrace,
	traceSubAgentTools,
	withTraceRun,
} from './tracing-utils';
import { registerWithMastra } from '../../agent/register-with-mastra';
import { MAX_STEPS } from '../../constants/max-steps';
import {
	createLlmStepTraceHooks,
	executeResumableStream,
} from '../../runtime/resumable-stream-executor';
import {
	buildAgentTraceInputs,
	getTraceParentRun,
	mergeTraceRunInputs,
	withTraceParentContext,
} from '../../tracing/langsmith-tracing';
import type { OrchestrationContext } from '../../types';
import { createToolsFromLocalMcpServer } from '../filesystem/create-tools-from-mcp-server';
import { createResearchTool } from '../research.tool';
import { createAskUserTool } from '../shared/ask-user.tool';

export { buildBrowserAgentPrompt, type BrowserToolSource } from './browser-credential-setup.prompt';

const PERMANENT_DENIAL_MARKER = 'User permanently denied access to';
const BROWSER_DENIED_RESULT =
	'Browser access was denied by the user. Provide manual setup guidance in chat — do not try the browser flow again in this turn.';

const browserToolErrorResultSchema = z.object({
	isError: z.literal(true),
	structuredContent: z.object({ error: z.string().optional() }).optional(),
	content: z.array(z.object({ text: z.string() }).passthrough()).optional(),
});

function isPermanentDenialResult(result: unknown): boolean {
	const parsed = browserToolErrorResultSchema.safeParse(result);
	if (!parsed.success) return false;
	const messages = [
		parsed.data.structuredContent?.error ?? '',
		...(parsed.data.content?.map((c) => c.text) ?? []),
	];
	return messages.some((m) => m.includes(PERMANENT_DENIAL_MARKER));
}

type ToolExecuteFn = (input: unknown, ctx: unknown) => Promise<unknown>;

function wrapToolForDenialDetection<T extends ToolsInput[string]>(
	tool: T,
	onDenied: () => void,
): T {
	const originalExecute = tool.execute as ToolExecuteFn | undefined;
	if (!originalExecute) return tool;
	const observingExecute: ToolExecuteFn = async (input, ctx) => {
		const result = await originalExecute(input, ctx);
		if (isPermanentDenialResult(result)) onDenied();
		return result;
	};
	return { ...tool, execute: observingExecute as T['execute'] };
}

function wrapBrowserToolsForDenialDetection(tools: ToolsInput, onDenied: () => void): ToolsInput {
	const wrapped: ToolsInput = {};
	for (const [name, tool] of Object.entries(tools)) {
		wrapped[name] = name.startsWith('browser_') ? wrapToolForDenialDetection(tool, onDenied) : tool;
	}
	return wrapped;
}

function createPauseForUserTool() {
	return createTool({
		id: 'pause-for-user',
		description:
			'Pause and wait for the user to complete an action in the browser (e.g., sign in, ' +
			'complete 2FA, click a button, enter values privately into n8n, download files). The user sees a message and confirms when done.',
		inputSchema: browserCredentialSetupInputSchema,
		outputSchema: z.object({
			continued: z.boolean(),
		}),
		suspendSchema: z.object({
			requestId: z.string(),
			message: z.string(),
			severity: instanceAiConfirmationSeveritySchema,
			inputType: z.literal('continue'),
		}),
		resumeSchema: browserCredentialSetupResumeSchema,
		execute: async (input: z.infer<typeof browserCredentialSetupInputSchema>, ctx) => {
			const resumeData = ctx?.agent?.resumeData as
				| z.infer<typeof browserCredentialSetupResumeSchema>
				| undefined;
			const suspend = ctx?.agent?.suspend;

			if (resumeData === undefined || resumeData === null) {
				await suspend?.({
					requestId: nanoid(),
					message: input.message,
					severity: 'info' as const,
					inputType: 'continue' as const,
				});
				return { continued: false };
			}

			return { continued: resumeData.approved };
		},
	});
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

export function createBrowserCredentialSetupTool(context: OrchestrationContext) {
	return createTool({
		id: 'browser-credential-setup',
		description:
			'Run a browser agent that navigates to credential documentation and helps the user ' +
			'set up a credential on the external service. The browser is visible to the user. ' +
			'The agent can pause for user interaction (sign-in, 2FA, etc.).',
		inputSchema: browserCredentialSetupToolInputSchema,
		outputSchema: z.object({
			result: z.string(),
		}),
		execute: async (input: z.infer<typeof browserCredentialSetupToolInputSchema>) => {
			// Determine tool source: prefer local gateway browser tools over chrome-devtools-mcp
			const browserTools: ToolsInput = {};
			let toolSource: BrowserToolSource;

			const gatewayBrowserTools = context.localMcpServer?.getToolsByCategory('browser') ?? [];

			if (gatewayBrowserTools.length > 0 && context.localMcpServer) {
				// Gateway path: create Mastra tools from gateway, keep only browser category tools
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

			let browserPermanentlyDenied = false;
			const browserToolsWithDenialDetection = wrapBrowserToolsForDenialDetection(
				browserTools,
				() => {
					browserPermanentlyDenied = true;
				},
			);

			// Add interaction tools
			browserToolsWithDenialDetection['pause-for-user'] = createPauseForUserTool();
			browserToolsWithDenialDetection['ask-user'] = createAskUserTool();

			// Add consolidated research tool (web-search + fetch-url) from the domain context
			if (context.domainContext) {
				browserToolsWithDenialDetection.research = createResearchTool(context.domainContext);
			}

			const subAgentId = `agent-browser-${nanoid(6)}`;

			// Publish agent-spawned so the UI shows the browser agent
			context.eventBus.publish(context.threadId, {
				type: 'agent-spawned',
				runId: context.runId,
				agentId: subAgentId,
				payload: {
					parentId: context.orchestratorAgentId,
					role: 'credential-setup-browser-agent',
					tools: Object.keys(browserToolsWithDenialDetection),
				},
			});
			let traceRun: Awaited<ReturnType<typeof startSubAgentTrace>>;
			try {
				traceRun = await startSubAgentTrace(context, {
					agentId: subAgentId,
					role: 'credential-setup-browser-agent',
					kind: 'browser-credential-setup',
					inputs: {
						credentialType: input.credentialType,
						docsUrl: input.docsUrl,
						requiredFields: input.requiredFields?.map(
							(field: {
								name: string;
								displayName: string;
								type: string;
								required: boolean;
								description?: string;
							}) => ({
								name: field.name,
								type: field.type,
								required: field.required,
							}),
						),
					},
				});
				const tracedBrowserTools = traceSubAgentTools(
					context,
					browserToolsWithDenialDetection,
					'credential-setup-browser-agent',
				);
				const browserPrompt = buildBrowserAgentPrompt(toolSource);
				const resultText = await withTraceRun(context, traceRun, async () => {
					const subAgent = new Agent({
						id: subAgentId,
						name: 'Browser Credential Setup Agent',
						instructions: {
							role: 'system' as const,
							content: browserPrompt,
							providerOptions: {
								anthropic: { cacheControl: { type: 'ephemeral' } },
							},
						},
						model: context.modelId,
						tools: tracedBrowserTools,
					});
					mergeTraceRunInputs(
						traceRun,
						buildAgentTraceInputs({
							systemPrompt: browserPrompt,
							tools: tracedBrowserTools,
							modelId: context.modelId,
						}),
					);

					registerWithMastra(subAgentId, subAgent, context.storage);

					// Build the briefing
					const docsLine = input.docsUrl
						? `**Documentation:** ${input.docsUrl}`
						: '**Documentation:** No URL available — use `research` (action: web-search) to find setup instructions.';

					let fieldsSection = '';
					if (input.requiredFields && input.requiredFields.length > 0) {
						const fieldLines = input.requiredFields.map(
							(f: {
								name: string;
								displayName: string;
								type: string;
								required: boolean;
								description?: string;
							}) =>
								`- ${f.displayName} (${f.name})${f.required ? ' [REQUIRED]' : ''}${f.description ? ': ' + f.description : ''}`,
						);
						fieldsSection = `\n### Required Fields\n${fieldLines.join('\n')}`;
					}

					// For OAuth2 credentials, include the redirect URL so the agent can
					// paste it directly into the "Authorized redirect URIs" field
					const isOAuth = input.credentialType.toLowerCase().includes('oauth');
					const oauthSection =
						isOAuth && context.oauth2CallbackUrl
							? `\n### OAuth Redirect URL\n${context.oauth2CallbackUrl}\n` +
								'Paste this into the "Authorized redirect URIs" field. ' +
								'Do NOT navigate to the n8n instance to find it — use this URL directly.'
							: '';

					const briefing = [
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

					const traceParent = getTraceParentRun();
					return await withTraceParentContext(traceParent, async () => {
						// Stream the sub-agent
						const llmStepTraceHooks = createLlmStepTraceHooks(traceParent);
						const stream = await subAgent.stream(briefing, {
							maxSteps: MAX_STEPS.BROWSER,
							abortSignal: context.abortSignal,
							providerOptions: {
								anthropic: { cacheControl: { type: 'ephemeral' } },
							},
							...(llmStepTraceHooks?.executionOptions ?? {}),
						});

						let activeStream = stream;
						let activeMastraRunId = typeof stream.runId === 'string' ? stream.runId : '';
						let lastSuspendedToolName = '';
						const MAX_NUDGES = 3;
						let nudgeCount = 0;

						while (true) {
							const result = await executeResumableStream({
								agent: subAgent,
								stream: activeStream,
								initialMastraRunId: activeMastraRunId,
								context: {
									threadId: context.threadId,
									runId: context.runId,
									agentId: subAgentId,
									eventBus: context.eventBus,
									signal: context.abortSignal,
									logger: context.logger,
								},
								control: {
									mode: 'auto',
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
								llmStepTraceHooks,
							});

							if (result.status === 'cancelled') {
								throw new Error('Run cancelled while waiting for confirmation');
							}

							// If the user has permanently denied browser access, stop here.
							// Don't nudge into pause-for-user — return a structured result so
							// the orchestrator can offer manual guidance via plain chat text.
							if (browserPermanentlyDenied) {
								return BROWSER_DENIED_RESULT;
							}

							if (lastSuspendedToolName !== 'pause-for-user' && nudgeCount < MAX_NUDGES) {
								// Agent ended without a final pause-for-user confirmation.
								// Replay the prior conversation + a nudge so the sub-agent
								// has full context to finish — Mastra `stream()` is otherwise
								// stateless across calls.
								nudgeCount++;
								const priorMessages = activeStream.messageList.get.all.aiV5.model();
								const nudgeInput = buildNudgeStreamInput(priorMessages);
								const nudge = await subAgent.stream(nudgeInput, {
									maxSteps: MAX_STEPS.BROWSER,
									abortSignal: context.abortSignal,
									providerOptions: {
										anthropic: { cacheControl: { type: 'ephemeral' } },
									},
									...(llmStepTraceHooks?.executionOptions ?? {}),
								});
								activeStream = nudge;
								activeMastraRunId =
									(typeof nudge.runId === 'string' && nudge.runId) ||
									result.mastraRunId ||
									activeMastraRunId;
								continue;
							}

							return await (result.text ?? activeStream.text ?? Promise.resolve(''));
						}
					});
				});
				await finishTraceRun(context, traceRun, {
					outputs: {
						result: resultText,
						agentId: subAgentId,
						role: 'credential-setup-browser-agent',
					},
				});

				context.eventBus.publish(context.threadId, {
					type: 'agent-completed',
					runId: context.runId,
					agentId: subAgentId,
					payload: {
						role: 'credential-setup-browser-agent',
						result: resultText,
					},
				});

				return { result: resultText };
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				await failTraceRun(context, traceRun, error, {
					agent_id: subAgentId,
					agent_role: 'credential-setup-browser-agent',
				});

				context.eventBus.publish(context.threadId, {
					type: 'agent-completed',
					runId: context.runId,
					agentId: subAgentId,
					payload: {
						role: 'credential-setup-browser-agent',
						result: '',
						error: errorMessage,
					},
				});

				return { result: `Browser agent error: ${errorMessage}` };
			}
		},
	});
}
