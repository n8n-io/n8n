import type { BuiltTool } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import { BROWSER_USE_CONNECT_CARD_NAME } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { ToolDefinition } from '@n8n/mcp-browser';
import { isRecord } from '@n8n/utils/is-record';
import type { JSONSchema7, JSONSchema7Definition, JSONSchema7Type } from 'json-schema';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

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

/**
 * One payload, two renderers.
 *
 * `components` is what `buildSuspendCardPayload` turns into Block Kit on a
 * channel; `type` and `setupUrl` are what the in-app chat matches on to render
 * its own card. Neither surface minds the other's fields.
 */
const CONNECT_SUSPEND_SCHEMA = z.object({
	type: z.literal(BROWSER_USE_CONNECT_CARD_NAME),
	title: z.string(),
	message: z.string(),
	setupUrl: z.string(),
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

function isObjectSchema(value: JSONSchema7Definition | undefined): value is JSONSchema7 {
	return typeof value === 'object' && value !== null && value.type === 'object';
}

/** The values a property is pinned to, if it is a `const` or an `enum`. */
function literalValues(schema: JSONSchema7Definition): JSONSchema7Type[] | null {
	if (typeof schema !== 'object' || schema === null) return null;
	if (schema.const !== undefined) return [schema.const];
	if (Array.isArray(schema.enum)) return [...schema.enum];
	return null;
}

/**
 * Merge one property's definitions from across every union branch.
 *
 * The discriminator is the interesting case: each branch pins it to a
 * different literal, and naively taking the last would hide the other modes
 * from the model. Those collapse into a single `enum`. Anything else that
 * genuinely differs becomes a nested `anyOf`, which providers do allow — it is
 * only the top level that is off limits.
 */
function mergePropertyVariants(variants: JSONSchema7Definition[]): JSONSchema7Definition {
	const [first, ...rest] = variants;
	if (rest.length === 0) return first;

	const serialized = new Set(variants.map((variant) => JSON.stringify(variant)));
	if (serialized.size === 1) return first;

	const literals = variants.map(literalValues);
	if (literals.every((values): values is JSONSchema7Type[] => values !== null)) {
		const description = variants
			.map((variant) => (typeof variant === 'object' ? variant.description : undefined))
			.find(Boolean);
		return {
			enum: [...new Set(literals.flat())],
			...(description ? { description } : {}),
		};
	}

	return { anyOf: variants };
}

/**
 * Convert a browser tool's zod schema into something a model provider accepts.
 *
 * `browser_scroll`, `browser_cookies` and `browser_storage` are discriminated
 * unions, which convert to a top-level `anyOf`. Anthropic refuses that outright
 * — "input_schema does not support oneOf, allOf, or anyOf at the top level" —
 * and it rejects the whole request, so a single such tool takes the entire
 * agent down rather than just itself.
 *
 * They are flattened into one object: the union of every branch's properties,
 * requiring only what all branches agree on. That is deliberately looser than
 * the real contract, which is safe because the genuine zod schema still runs
 * inside `callTool` — an invalid combination comes back to the model as a
 * validation error it can correct, instead of breaking the conversation.
 *
 * Returns null for a schema we cannot express, so the caller can drop that one
 * tool instead of poisoning every request.
 */
function toProviderInputSchema(descriptor: ToolDefinition): JSONSchema7 | null {
	const { $schema, ...schema } = zodToJsonSchema(descriptor.inputSchema) as JSONSchema7 & {
		$schema?: string;
	};

	if (schema.type === 'object') return schema;

	const branches = schema.anyOf ?? schema.oneOf;
	if (!Array.isArray(branches) || branches.length === 0 || !branches.every(isObjectSchema)) {
		return null;
	}

	const propertyVariants = new Map<string, JSONSchema7Definition[]>();
	for (const branch of branches) {
		for (const [name, definition] of Object.entries(branch.properties ?? {})) {
			propertyVariants.set(name, [...(propertyVariants.get(name) ?? []), definition]);
		}
	}

	const properties = Object.fromEntries(
		[...propertyVariants].map(([name, variants]) => [name, mergePropertyVariants(variants)]),
	);
	const required = (branches[0].required ?? []).filter((name) =>
		branches.every((branch) => branch.required?.includes(name)),
	);

	return {
		type: 'object',
		properties,
		...(required.length > 0 ? { required } : {}),
		...(schema.description ? { description: schema.description } : {}),
	};
}

function buildConnectCard(setupUrl: string) {
	const message = `Open ${setupUrl} to connect your browser, then continue.`;

	return {
		type: BROWSER_USE_CONNECT_CARD_NAME,
		title: 'Connect Browser Use',
		message,
		setupUrl,
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
export async function createBrowserUseTools(params: {
	agentId: string;
	logger?: Pick<Logger, 'warn'>;
}): Promise<BuiltTool[]> {
	const { agentId, logger } = params;
	const descriptors = await getBrowserToolDescriptors();

	const buildable: Array<{ descriptor: ToolDefinition; inputSchema: JSONSchema7 }> = [];
	for (const descriptor of descriptors) {
		const inputSchema = toProviderInputSchema(descriptor);
		if (!inputSchema) {
			logger?.warn('Skipping browser tool with an input schema no provider accepts', {
				tool: descriptor.name,
			});
			continue;
		}
		buildable.push({ descriptor, inputSchema });
	}

	return buildable.map(({ descriptor, inputSchema }) =>
		new Tool(descriptor.name)
			.description(descriptor.description)
			.input(inputSchema)
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
