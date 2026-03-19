import { Agent } from '@mastra/core/agent';
import type { ToolsInput } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { registerWithMastra } from '../../agent/register-with-mastra';
import { mapMastraChunkToEvent } from '../../stream/map-chunk';
import type { OrchestrationContext } from '../../types';
import { parseSuspension, asResumable } from '../../utils/stream-helpers';

const BROWSER_AGENT_MAX_STEPS = 300;

const BROWSER_AGENT_PROMPT = `You are a browser automation agent helping a user set up an n8n credential.

## Your Goal
Help the user obtain ALL required credential values (listed in the briefing). Your job is NOT done until the user has a Client ID, Client Secret, API Key, or whatever the credential requires — visible on screen and ready to copy.

## CRITICAL: When to stop
You may ONLY stop when ONE of these is true:
- You have called pause-for-user telling the user to copy the ACTUAL credential values (Client ID, Client Secret, API Key, etc.) that are VISIBLE on screen
- An unrecoverable error occurred (e.g., the service is down)

**If you have NOT yet called pause-for-user with the credential values, you are NOT done. Keep going.**

You must NOT stop just because you:
- Read the docs
- Navigated to the console
- Checked that an API is enabled
- Saw that an OAuth consent screen exists
- Clicked a menu item
- Navigated to the credentials page
- Enabled an API
These are ALL intermediate steps — keep going until the credential values are on screen.

## Process
1. Navigate to the n8n documentation URL and read it using \`evaluate_script\` with \`() => document.body.innerText\` (NOT take_snapshot — docs pages have 250KB accessibility trees that fill up context).
2. Follow the documentation step by step on the service's website.
3. On service pages, first use \`evaluate_script\` to find interactive elements, then \`take_snapshot\` ONLY when you need UIDs for click/fill.
4. For each required credential field, navigate to where the user can create/find that value.
5. When the user needs to interact (sign in, complete 2FA, click buttons, copy values), call pause-for-user with a clear message.
6. After each pause, take a snapshot to verify the action was completed.
7. Continue until the credential values are visible on screen.
8. Your FINAL action must be pause-for-user telling the user to copy the values. If you stop without this, the system will ask the user anyway — but it's better if you do it with specific instructions about what to copy.

## Resilience
- Documentation may be outdated or the UI may have changed. Use your best judgment.
- If a button or link from the docs doesn't exist, look at what IS on the page and adapt.
- If something is already configured (e.g., consent screen exists, API is enabled), skip that step and move to the NEXT one.
- If you see the values you need are already on screen, skip ahead to telling the user to copy them.
- Always take a snapshot after clicking to see what actually loaded.

## Reading pages vs interacting

**To READ a page** (docs, instructions, any content page):
Use \`evaluate_script\` with \`() => document.body.innerText\` to get the text content (~5KB). This is 50x smaller than take_snapshot on docs pages.

**To FIND interactive elements** (buttons, links, forms):
Use \`evaluate_script\` with this function to get a compact list of clickable elements:
\`() => { const els = document.querySelectorAll('a[href], button, input, select, [role="button"], [role="link"]'); return [...els].filter(e => e.offsetParent !== null).slice(0, 100).map(e => ({ tag: e.tagName, text: (e.textContent||'').trim().slice(0,80), href: e.href||'', id: e.id||'', aria: e.getAttribute('aria-label')||'' })) }\`

**To CLICK or FILL** (need element UIDs):
Use \`take_snapshot\` — but ONLY when you've identified what to click and need the uid. Never snapshot docs pages.

**NEVER use \`take_screenshot\`** — screenshots are base64 images that consume enormous context.

## Rules
- The browser is visible to the user (headful mode).
- Use pause-for-user EVERY time the user needs to do something (sign in, click, copy values).
- Do NOT narrate what you plan to do — just DO it. Take action, check the result.
- Do NOT try to read or extract secret values. Tell the user to copy them.
- If a page takes time to load, use wait_for before taking a snapshot.
- Be economical with snapshots — only take_snapshot when you need element UIDs to click/fill.
- **CRITICAL: NEVER end your turn after navigate_page without a follow-up action.** After every navigation, you MUST either take_snapshot or evaluate_script to see what loaded, then continue working. Your turn should only end after calling pause-for-user.`;

function createPauseForUserTool() {
	return createTool({
		id: 'pause-for-user',
		description:
			'Pause and wait for the user to complete an action in the browser (e.g., sign in, ' +
			'complete 2FA, click a button). The user sees a message and confirms when done.',
		inputSchema: z.object({
			message: z.string().describe('What the user needs to do (shown in the chat UI)'),
		}),
		outputSchema: z.object({
			continued: z.boolean(),
		}),
		suspendSchema: z.object({
			requestId: z.string(),
			message: z.string(),
			severity: instanceAiConfirmationSeveritySchema,
		}),
		resumeSchema: z.object({
			approved: z.boolean(),
		}),
		execute: async (input, ctx) => {
			const { resumeData, suspend } = ctx?.agent ?? {};

			if (resumeData === undefined || resumeData === null) {
				await suspend?.({
					requestId: nanoid(),
					message: input.message,
					severity: 'info' as const,
				});
				return { continued: false };
			}

			return { continued: resumeData.approved };
		},
	});
}

export function createBrowserCredentialSetupTool(context: OrchestrationContext) {
	return createTool({
		id: 'browser-credential-setup',
		description:
			'Run a browser agent that navigates to credential documentation and helps the user ' +
			'set up a credential on the external service. The browser is visible to the user. ' +
			'The agent can pause for user interaction (sign-in, 2FA, etc.).',
		inputSchema: z.object({
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
		}),
		outputSchema: z.object({
			result: z.string(),
		}),
		execute: async (input) => {
			if (!context.browserMcpConfig) {
				return {
					result: 'Browser automation is not configured. Set N8N_INSTANCE_AI_BROWSER_MCP=true.',
				};
			}

			// Collect browser MCP tools from the orchestration context
			const browserTools: ToolsInput = {};
			const mcpTools = context.mcpTools ?? {};
			for (const [name, tool] of Object.entries(mcpTools)) {
				// Include all MCP tools — browser agent may need them all
				browserTools[name] = tool;
			}

			if (Object.keys(browserTools).length === 0) {
				return {
					result: 'No browser MCP tools available. Chrome DevTools MCP may not be connected.',
				};
			}

			// Add the pause-for-user tool
			browserTools['pause-for-user'] = createPauseForUserTool();

			const subAgentId = `agent-browser-${nanoid(6)}`;

			// Publish agent-spawned so the UI shows the browser agent
			context.eventBus.publish(context.threadId, {
				type: 'agent-spawned',
				runId: context.runId,
				agentId: subAgentId,
				payload: {
					parentId: context.orchestratorAgentId,
					role: 'credential-setup-browser-agent',
					tools: Object.keys(browserTools),
				},
			});

			try {
				const subAgent = new Agent({
					id: subAgentId,
					name: 'Browser Credential Setup Agent',
					instructions: {
						role: 'system' as const,
						content: BROWSER_AGENT_PROMPT,
						providerOptions: {
							anthropic: { cacheControl: { type: 'ephemeral' } },
						},
					},
					model: context.modelId,
					tools: browserTools,
				});

				registerWithMastra(subAgentId, subAgent, context.storage, context.tracingConfig);

				// Build the briefing
				const docsInfo = input.docsUrl
					? `Documentation URL: ${input.docsUrl}`
					: 'No documentation URL available — search for setup instructions online.';

				// Build fields context so the agent knows exactly what to look for
				let fieldsInfo = '';
				if (input.requiredFields && input.requiredFields.length > 0) {
					const fieldLines = input.requiredFields.map(
						(f) =>
							`- ${f.displayName} (${f.name})${f.required ? ' [REQUIRED]' : ''}${f.description ? ': ' + f.description : ''}`,
					);
					fieldsInfo = '\n\nCREDENTIAL FIELDS THE USER NEEDS:\n' + fieldLines.join('\n');
				}

				// For OAuth2 credentials, include the redirect URL so the agent can
				// paste it directly into the "Authorized redirect URIs" field
				const isOAuth = input.credentialType.toLowerCase().includes('oauth');
				const oauthInfo =
					isOAuth && context.oauth2CallbackUrl
						? `\n\nOAUTH REDIRECT URL: ${context.oauth2CallbackUrl}\n` +
							'When creating OAuth client credentials, paste this URL into the "Authorized redirect URIs" field. ' +
							'Do NOT navigate to the n8n instance to find it — use this URL directly.'
						: '';

				const briefing =
					`Set up a credential of type: ${input.credentialType}\n\n` +
					`${docsInfo}${fieldsInfo}${oauthInfo}\n\n` +
					'COMPLETION CRITERIA: You are done ONLY when the required credential values ' +
					'are visible on screen and the user has been told to copy them. ' +
					'Everything before that is an intermediate step — keep going.';

				// Stream the sub-agent
				const stream = await subAgent.stream(briefing, {
					maxSteps: BROWSER_AGENT_MAX_STEPS,
					abortSignal: context.abortSignal,
					providerOptions: {
						anthropic: { cacheControl: { type: 'ephemeral' } },
					},
				});

				let subAgentStream: AsyncIterable<unknown> = stream.fullStream;
				let subMastraRunId = (stream as { runId?: string }).runId ?? '';
				let streamCompleted = false;
				let lastSuspendedToolName = '';
				const MAX_NUDGES = 3;
				let nudgeCount = 0;

				while (!streamCompleted) {
					let suspended: { toolCallId: string; requestId: string } | null = null;
					let suspendedToolName = '';

					for await (const chunk of subAgentStream) {
						const suspension = parseSuspension(chunk);
						if (suspension) {
							suspended = suspension;
							suspendedToolName = suspension.toolName ?? '';
						}
						const event = mapMastraChunkToEvent(context.runId, subAgentId, chunk);
						if (event) {
							context.eventBus.publish(context.threadId, event);
						}
					}

					if (suspended) {
						if (!context.waitForConfirmation) {
							throw new Error(
								'Browser agent requires user interaction but no HITL handler is available',
							);
						}
						lastSuspendedToolName = suspendedToolName;
						const confirmResult = await context.waitForConfirmation(suspended.requestId);
						const resumed = await asResumable(subAgent).resumeStream(confirmResult, {
							runId: subMastraRunId,
							toolCallId: suspended.toolCallId,
						});
						subMastraRunId =
							(typeof resumed.runId === 'string' ? resumed.runId : '') || subMastraRunId;
						subAgentStream = resumed.fullStream;
					} else if (lastSuspendedToolName !== 'pause-for-user' && nudgeCount < MAX_NUDGES) {
						// Agent ended without a final pause-for-user confirmation.
						// Re-invoke with a nudge to call pause-for-user.
						nudgeCount++;
						const nudge = await subAgent.stream(
							'You stopped without confirming with the user. Call pause-for-user NOW to ask the user if they have the credential values (Client ID, Client Secret, API Key, etc.) copied and ready to paste into n8n.',
							{
								maxSteps: BROWSER_AGENT_MAX_STEPS,
								abortSignal: context.abortSignal,
								providerOptions: {
									anthropic: { cacheControl: { type: 'ephemeral' } },
								},
							},
						);
						subMastraRunId = (nudge as { runId?: string }).runId ?? subMastraRunId;
						subAgentStream = nudge.fullStream;
					} else {
						streamCompleted = true;
					}
				}

				const resultText = await stream.text;

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
