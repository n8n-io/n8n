import type { BuiltTool } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import { Container } from '@n8n/di';
import type { ToolDefinition } from '@n8n/mcp-browser';
import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

import { InstanceAiBrowserSessionService } from '@/modules/instance-ai/browser/instance-ai-browser-session.service';
import { UrlService } from '@/services/url.service';

import { AgentBrowserSetupTokenService } from '../browser-use/agent-browser-setup-token.service';
import { browserSessionKeyFor } from '../browser-use/browser-use-session-key';

/**
 * Tools we deliberately do not hand to an agent.
 *
 * Session lifecycle is ours — the extension handshake decides when a browser is
 * connected, not the model. The credential tools are excluded because they
 * resolve the session key against the user table, and an agent's key is a
 * synthetic hash rather than a real user id.
 */
const EXCLUDED_TOOLS = new Set([
	'browser_connect',
	'browser_disconnect',
	'browser_capture_secret',
	'browser_create_credential',
]);

/** Shape `buildSuspendCardPayload` renders as a card on Slack and in the preview. */
const CONNECT_SUSPEND_SCHEMA = z.object({
	title: z.string(),
	message: z.string(),
	components: z.array(z.record(z.unknown())),
});

/**
 * `ComponentMapper.wrapValueForSchema` maps a button click onto exactly this
 * shape when the resume schema declares `type` and `value`.
 */
const CONNECT_RESUME_SCHEMA = z.object({
	type: z.string(),
	value: z.string(),
});

let descriptorsPromise: Promise<ToolDefinition[]> | undefined;

/**
 * Read the browser tools' names, descriptions and input schemas.
 *
 * Agent tools are registered when the runtime is built, long before any user
 * has connected a browser, so the descriptors cannot come from a live session.
 * The connection this creates is never connected to and is discarded — its
 * constructor only parses config and reads a cached synchronous browser probe.
 */
async function getBrowserToolDescriptors(): Promise<ToolDefinition[]> {
	descriptorsPromise ??= (async () => {
		const { createBrowserTools } = await import('@n8n/mcp-browser');
		const { tools } = createBrowserTools({ mode: 'remote' });
		return tools.filter((tool) => !EXCLUDED_TOOLS.has(tool.name));
	})();

	return await descriptorsPromise;
}

function buildConnectCard(setupUrl: string) {
	const message = `Open ${setupUrl} to connect your browser, then continue.`;

	return {
		title: 'Connect Browser Use',
		message,
		components: [
			{
				type: 'section',
				text: `Let the agent automate tasks in your browser. Install the n8n Browser Use extension and connect it — no other software needed.\n\n${setupUrl}`,
			},
			{
				type: 'button',
				label: "I've connected — continue",
				value: 'continue',
				style: 'primary',
			},
		],
	};
}

function errorResult(text: string) {
	return { content: [{ type: 'text', text }], isError: true };
}

/**
 * Build the agent-facing Browser Use tools.
 *
 * Nothing user-specific is captured here on purpose: the runtime these tools
 * are attached to is cached and shared across every end user of a published
 * agent. The browser session is resolved per call from `ctx.persistence`, the
 * same way the channel integration tools resolve their message context.
 */
export async function createBrowserUseTools(params: { agentId: string }): Promise<BuiltTool[]> {
	const { agentId } = params;
	const descriptors = await getBrowserToolDescriptors();

	return descriptors.map((descriptor) =>
		new Tool(descriptor.name)
			.description(descriptor.description)
			.input(descriptor.inputSchema)
			.suspend(CONNECT_SUSPEND_SCHEMA)
			.resume(CONNECT_RESUME_SCHEMA)
			.handler(async (input, ctx) => {
				const sessionKey = browserSessionKeyFor(agentId, ctx.persistence?.resourceId);
				if (!sessionKey) {
					return errorResult(
						'Browser Use is unavailable in this context because the run has nobody to connect a browser.',
					);
				}

				const sessions = Container.get(InstanceAiBrowserSessionService);
				const mcpServer = sessions.isConnected(sessionKey)
					? sessions.findMcpServer(sessionKey)
					: undefined;

				if (!mcpServer) {
					// Already asked once and the browser still is not there. Suspending
					// again would trap the user in a loop, so hand the model an error it
					// can explain instead.
					if (ctx.resumeData !== undefined) {
						return errorResult(
							'No browser is connected yet. Ask the user to finish connecting the n8n Browser Use extension, then try again.',
						);
					}

					const token = Container.get(AgentBrowserSetupTokenService).issue(sessionKey);
					const setupUrl = `${Container.get(UrlService).getInstanceBaseUrl()}/browser-use/connect?token=${token}`;

					return await ctx.suspend(buildConnectCard(setupUrl), {
						resumeSchema: CONNECT_RESUME_SCHEMA,
					});
				}

				return await mcpServer.callTool({
					name: descriptor.name,
					arguments: isRecord(input) ? input : {},
				});
			})
			.build(),
	);
}
