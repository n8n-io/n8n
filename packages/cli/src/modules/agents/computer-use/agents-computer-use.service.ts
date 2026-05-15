import type {
	AgentMessage,
	BuiltTool,
	InterruptibleToolContext,
	MessageContent,
} from '@n8n/agents';
import type {
	AgentComputerUseAffectedResource,
	AgentComputerUseStatusResponse,
	McpTool,
	McpToolCallResult,
} from '@n8n/api-types';
import { AgentsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { JSONSchema7, JSONSchema7Type } from 'json-schema';
import { z } from 'zod';

import { ComputerUseGatewayService } from '@/modules/computer-use-gateway/computer-use-gateway.service';
import type { LocalGateway } from '@/modules/computer-use-gateway/local-gateway';
import { UrlService } from '@/services/url.service';

import type { AgentJsonConfig } from '../json-config/agent-json-config';

const FILESYSTEM_READ_TOOLS = new Set([
	'list_files',
	'get_file_tree',
	'stat_path',
	'search_files',
	'read_file',
]);

const FILESYSTEM_WRITE_TOOLS = new Set([
	'write_file',
	'edit_file',
	'create_directory',
	'copy_file',
	'move',
	'delete_to_trash',
]);

const SHELL_TOOLS = new Set([
	'shell_execute',
	'process_start',
	'process_poll',
	'process_wait',
	'process_write',
	'process_kill',
]);

const BROWSER_OBSERVE_TOOLS = new Set([
	'browser_connect',
	'browser_disconnect',
	'browser_tab_list',
	'browser_tab_focus',
	'browser_snapshot',
	'browser_screenshot',
	'browser_content',
	'browser_console',
	'browser_network',
	'browser_hover',
	'browser_scroll',
	'browser_wait',
]);

const BROWSER_MUTATION_TOOLS = new Set([
	'browser_tab_open',
	'browser_tab_close',
	'browser_navigate',
	'browser_back',
	'browser_forward',
	'browser_reload',
	'browser_click',
	'browser_type',
	'browser_select',
	'browser_drag',
	'browser_press',
	'browser_dialog',
]);

const BROWSER_TOOLS = new Set([...BROWSER_OBSERVE_TOOLS, ...BROWSER_MUTATION_TOOLS]);

const APPROVAL_REQUIRED_TOOLS = new Set([
	...FILESYSTEM_WRITE_TOOLS,
	...BROWSER_MUTATION_TOOLS,
	'shell_execute',
	'process_start',
	'process_write',
	'process_kill',
]);

const PROCESS_TOOLS = new Set([
	'process_start',
	'process_poll',
	'process_wait',
	'process_write',
	'process_kill',
]);

const affectedResourceSchema = z.object({
	toolGroup: z.enum(['filesystemRead', 'filesystemWrite', 'shell', 'process', 'browser']),
	resource: z.string(),
	description: z.string(),
	preview: z
		.object({
			kind: z.enum(['text', 'diff']),
			title: z.string().optional(),
			content: z.string(),
			truncated: z.boolean().optional(),
		})
		.optional(),
}) satisfies z.ZodType<AgentComputerUseAffectedResource>;

const approvalSuspendSchema = z.object({
	type: z.literal('approval'),
	toolName: z.string(),
	args: z.unknown(),
	resources: z.array(affectedResourceSchema),
});

const approvalResumeSchema = z.object({
	approved: z.boolean(),
});

type JsonSchemaProperty = NonNullable<JSONSchema7['properties']>[string];

function normalizeInputSchema(inputSchema: McpTool['inputSchema']): JSONSchema7 {
	const schema = inputSchema as JSONSchema7;
	const variants = getSchemaVariants(schema);
	if (variants.length > 0) return flattenObjectVariants(schema, variants);

	if (schema.type === 'object') return schema;

	return { type: 'object', properties: {} };
}

function getSchemaVariants(schema: JSONSchema7): JSONSchema7[] {
	const variants = schema.oneOf ?? schema.anyOf ?? schema.allOf;
	if (!Array.isArray(variants)) return [];
	return variants.filter((variant): variant is JSONSchema7 => isRecord(variant));
}

function flattenObjectVariants(schema: JSONSchema7, variants: JSONSchema7[]): JSONSchema7 {
	const properties: NonNullable<JSONSchema7['properties']> = {};
	let commonRequired: Set<string> | undefined;

	for (const variant of variants) {
		for (const [name, property] of Object.entries(variant.properties ?? {})) {
			properties[name] = mergePropertySchema(properties[name], property);
		}

		const required = new Set((variant.required ?? []).filter((name) => typeof name === 'string'));
		commonRequired =
			commonRequired === undefined
				? required
				: new Set([...commonRequired].filter((name) => required.has(name)));
	}

	const flattened: JSONSchema7 = {
		type: 'object',
		properties,
	};
	if (schema.description) flattened.description = schema.description;
	if (commonRequired !== undefined && commonRequired.size > 0) {
		flattened.required = [...commonRequired];
	}
	return flattened;
}

function mergePropertySchema(
	existing: JsonSchemaProperty | undefined,
	next: JsonSchemaProperty,
): JsonSchemaProperty {
	if (existing === undefined) return next;
	if (typeof existing === 'boolean' || typeof next === 'boolean') return existing;

	const existingValues = getLiteralValues(existing);
	const nextValues = getLiteralValues(next);
	if (existingValues.length === 0 && nextValues.length === 0) return existing;

	return {
		...omitConst(existing),
		enum: [...new Set([...existingValues, ...nextValues])],
	};
}

function getLiteralValues(schema: JSONSchema7): JSONSchema7Type[] {
	const values: JSONSchema7Type[] = [];
	if (Array.isArray(schema.enum)) values.push(...schema.enum);
	if (schema.const !== undefined) values.push(schema.const);
	return values;
}

function omitConst(schema: JSONSchema7): JSONSchema7 {
	const { const: _const, ...rest } = schema;
	return rest;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stripConfirmation(args: unknown): Record<string, unknown> {
	if (!isRecord(args)) return {};
	const { _confirmation, _n8nPreviewOnly, ...cleanArgs } = args;
	return cleanArgs;
}

function normalizeToolResult(result: McpToolCallResult): unknown {
	if (result.isError) {
		const message = result.structuredContent?.error ?? textContent(result) ?? 'Gateway tool failed';
		throw new Error(String(message));
	}

	if (result.structuredContent !== undefined) return result.structuredContent;
	if (result.content.some((item) => item.type === 'image')) {
		return { content: result.content };
	}

	const text = textContent(result);
	if (!text) return {};

	try {
		return JSON.parse(text) as unknown;
	} catch {
		return { content: text };
	}
}

function textContent(result: McpToolCallResult): string {
	return result.content
		.filter((item): item is { type: 'text'; text: string } => item.type === 'text')
		.map((item) => item.text)
		.join('\n');
}

function isImageContent(
	value: McpToolCallResult['content'][number],
): value is { type: 'image'; data: string; mimeType: string } {
	return value.type === 'image';
}

function isTextContent(
	value: McpToolCallResult['content'][number],
): value is { type: 'text'; text: string } {
	return value.type === 'text';
}

function getResultContent(output: unknown): McpToolCallResult['content'] | null {
	if (!isRecord(output)) return null;
	const content = output.content;
	if (!Array.isArray(content)) return null;
	return content.filter(
		(item): item is McpToolCallResult['content'][number] =>
			isRecord(item) &&
			((item.type === 'text' && typeof item.text === 'string') ||
				(item.type === 'image' &&
					typeof item.data === 'string' &&
					typeof item.mimeType === 'string')),
	);
}

function browserResultToMessage(output: unknown): AgentMessage | undefined {
	const content = getResultContent(output);
	if (!content?.some(isImageContent)) return undefined;

	const parts: MessageContent[] = [];
	for (const item of content) {
		if (isImageContent(item)) {
			parts.push({ type: 'file', data: item.data, mediaType: item.mimeType });
			continue;
		}
		if (isTextContent(item) && item.text) {
			parts.push({ type: 'text', text: item.text });
		}
	}

	return parts.length > 0 ? { role: 'assistant', content: parts } : undefined;
}

function browserResultToModelOutput(output: unknown): unknown {
	const content = getResultContent(output);
	if (!content?.some(isImageContent)) return output;

	const text = content
		.filter(isTextContent)
		.map((item) => item.text)
		.join('\n');
	return {
		content: text || 'Browser screenshot captured',
		images: content.filter(isImageContent).map((item) => ({ mimeType: item.mimeType })),
	};
}

function describeBrowserTarget(value: unknown): string {
	if (!isRecord(value)) return 'current page';
	if (typeof value.ref === 'string') return `ref: ${value.ref}`;
	if (typeof value.selector === 'string') return `selector: ${value.selector}`;
	return 'current page';
}

function browserPreviewContent(toolName: string, args: Record<string, unknown>): string {
	switch (toolName) {
		case 'browser_tab_open':
			return `Open tab: ${typeof args.url === 'string' ? args.url : 'about:blank'}`;
		case 'browser_tab_close':
			return `Close tab: ${typeof args.pageId === 'string' ? args.pageId : 'active tab'}`;
		case 'browser_navigate':
			return `Navigate to: ${typeof args.url === 'string' ? args.url : 'unknown URL'}`;
		case 'browser_back':
			return 'Navigate back in browser history';
		case 'browser_forward':
			return 'Navigate forward in browser history';
		case 'browser_reload':
			return 'Reload the current page';
		case 'browser_click':
			return `Click ${describeBrowserTarget(args.element)}`;
		case 'browser_type':
			return `Type into ${describeBrowserTarget(args.element)}:\n${String(args.text ?? '')}`;
		case 'browser_select':
			return `Select in ${describeBrowserTarget(args.element)}:\n${JSON.stringify(args.values ?? [])}`;
		case 'browser_drag':
			return `Drag from ${describeBrowserTarget(args.from)} to ${describeBrowserTarget(args.to)}`;
		case 'browser_press':
			return `Press keys: ${String(args.keys ?? '')}`;
		case 'browser_dialog':
			return `Handle dialog: ${String(args.action ?? '')}${
				typeof args.text === 'string' ? `\nText: ${args.text}` : ''
			}`;
		default:
			return toolName;
	}
}

function addBrowserPreview(
	toolName: string,
	args: Record<string, unknown>,
	resources: AgentComputerUseAffectedResource[],
): AgentComputerUseAffectedResource[] {
	if (!BROWSER_MUTATION_TOOLS.has(toolName)) return resources;
	const preview = {
		kind: 'text' as const,
		title: `Preview action: ${toolName}`,
		content: browserPreviewContent(toolName, args),
	};

	if (resources.length === 0) {
		return [
			{
				toolGroup: 'browser',
				resource: 'browser',
				description: `Browser action: ${toolName}`,
				preview,
			},
		];
	}

	return resources.map((resource, index) =>
		index === 0 && resource.toolGroup === 'browser' && resource.preview === undefined
			? { ...resource, preview }
			: resource,
	);
}

@Service()
export class AgentsComputerUseService {
	constructor(
		private readonly agentsConfig: AgentsConfig,
		private readonly gatewayService: ComputerUseGatewayService,
		private readonly urlService: UrlService,
	) {}

	isModuleEnabled(): boolean {
		return this.agentsConfig.modules.includes('computer-use');
	}

	createPairingLink(userId: string): {
		token: string;
		command: string;
		expiresAt: string | null;
		ttlSeconds: number | null;
	} {
		const token = this.gatewayService.generatePairingToken(userId);
		const expiresAt = this.gatewayService.getGatewayApiKeyExpiresAt(userId, token);
		const ttlSeconds = expiresAt
			? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000))
			: null;
		const baseUrl = this.urlService.getInstanceBaseUrl();
		return {
			token,
			command: `npx @n8n/computer-use ${baseUrl} ${token}`,
			expiresAt: expiresAt?.toISOString() ?? null,
			ttlSeconds,
		};
	}

	getStatus(userId: string): AgentComputerUseStatusResponse {
		const status = this.gatewayService.getGatewayStatus(userId);
		const tools = new Set(status.tools.map((tool) => tool.name));
		const categories = new Map(status.toolCategories.map((category) => [category.name, category]));
		const filesystemCategory = categories.get('filesystem');
		const shellCategory = categories.get('shell');
		const browserCategory = categories.get('browser');
		const browserEnabled =
			browserCategory?.enabled === true && [...BROWSER_TOOLS].some((name) => tools.has(name));
		const browserPermissionMode = browserCategory?.permissionMode ?? null;

		return {
			moduleEnabled: this.isModuleEnabled(),
			connected: status.connected,
			connectedAt: status.connectedAt,
			directory: status.directory,
			hostIdentifier: status.hostIdentifier,
			capabilities: {
				filesystem: {
					enabled: filesystemCategory?.enabled === true,
					write:
						filesystemCategory?.enabled === true &&
						filesystemCategory.writeAccess === true &&
						[...FILESYSTEM_WRITE_TOOLS].some((toolName) => tools.has(toolName)),
				},
				shell: {
					enabled: shellCategory?.enabled === true && tools.has('shell_execute'),
					processes:
						shellCategory?.enabled === true && [...PROCESS_TOOLS].some((name) => tools.has(name)),
				},
				browser: {
					enabled: browserEnabled,
					permissionMode: browserPermissionMode,
					ready: browserEnabled && browserPermissionMode === 'allow',
				},
			},
		};
	}

	getRuntimeTools(config: AgentJsonConfig, userId: string): BuiltTool[] {
		if (!this.isModuleEnabled()) return [];
		if (config.computerUse?.enabled !== true) return [];

		const gateway = this.gatewayService.findGateway(userId);
		if (!gateway?.isConnected) return [];

		const status = gateway.getStatus();
		const categories = new Map(status.toolCategories.map((category) => [category.name, category]));
		const filesystemCategory = categories.get('filesystem');
		const shellCategory = categories.get('shell');
		const browserCategory = categories.get('browser');

		const filesystemEnabled =
			config.computerUse.filesystem?.enabled !== false && filesystemCategory?.enabled === true;
		const filesystemWriteEnabled =
			filesystemEnabled &&
			config.computerUse.filesystem?.write === true &&
			filesystemCategory?.writeAccess === true;
		const shellEnabled =
			config.computerUse.shell?.enabled === true && shellCategory?.enabled === true;
		const browserEnabled =
			config.computerUse.browser?.enabled === true &&
			browserCategory?.enabled === true &&
			browserCategory.permissionMode === 'allow';

		return status.tools.flatMap((tool) => {
			if (FILESYSTEM_READ_TOOLS.has(tool.name)) {
				return filesystemEnabled ? [this.toBuiltTool(tool, userId)] : [];
			}
			if (FILESYSTEM_WRITE_TOOLS.has(tool.name)) {
				return filesystemWriteEnabled ? [this.toBuiltTool(tool, userId)] : [];
			}
			if (SHELL_TOOLS.has(tool.name)) {
				return shellEnabled ? [this.toBuiltTool(tool, userId)] : [];
			}
			if (BROWSER_TOOLS.has(tool.name)) {
				return browserEnabled ? [this.toBuiltTool(tool, userId)] : [];
			}
			return [];
		});
	}

	private toBuiltTool(tool: McpTool, userId: string): BuiltTool {
		const requiresApproval = APPROVAL_REQUIRED_TOOLS.has(tool.name);
		const builtTool: BuiltTool = {
			name: tool.name,
			description:
				tool.description ?? `Run ${tool.name} through the connected computer-use gateway`,
			inputSchema: normalizeInputSchema(tool.inputSchema),
			editable: false,
			metadata: { computerUse: true },
			handler: async (input, ctx) => await this.handleToolCall(tool.name, userId, input, ctx),
			...(BROWSER_TOOLS.has(tool.name)
				? {
						toMessage: browserResultToMessage,
						toModelOutput: browserResultToModelOutput,
					}
				: {}),
		};

		if (!requiresApproval) return builtTool;

		return {
			...builtTool,
			suspendSchema: approvalSuspendSchema,
			resumeSchema: approvalResumeSchema,
		};
	}

	private async handleToolCall(
		toolName: string,
		userId: string,
		input: unknown,
		ctx: Parameters<NonNullable<BuiltTool['handler']>>[1],
	): Promise<unknown> {
		const gateway = this.gatewayService.findGateway(userId);
		if (!gateway?.isConnected) {
			throw new Error('Computer Use gateway is not connected');
		}

		const args = stripConfirmation(input);

		if (APPROVAL_REQUIRED_TOOLS.has(toolName)) {
			const interruptCtx = ctx as InterruptibleToolContext<
				z.infer<typeof approvalSuspendSchema>,
				z.infer<typeof approvalResumeSchema>
			>;
			if (interruptCtx.resumeData === undefined) {
				return await interruptCtx.suspend({
					type: 'approval',
					toolName,
					args,
					resources: await this.getAffectedResources(toolName, args, gateway),
				});
			}

			if (!interruptCtx.resumeData.approved) {
				return {
					approved: false,
					message: `Computer Use action "${toolName}" was not approved`,
				};
			}
		}

		const result = await gateway.callTool({
			name: toolName,
			arguments: APPROVAL_REQUIRED_TOOLS.has(toolName)
				? { ...args, _confirmation: 'allowOnce' }
				: args,
		});
		return normalizeToolResult(result);
	}

	private async getAffectedResources(
		toolName: string,
		args: Record<string, unknown>,
		gateway: LocalGateway,
	): Promise<AgentComputerUseAffectedResource[]> {
		const result = await gateway.previewTool({
			name: toolName,
			arguments: args,
		});
		const normalized = normalizeToolResult(result);
		if (!isRecord(normalized) || !Array.isArray(normalized.resources)) {
			throw new Error(`Computer Use gateway did not return affected resources for "${toolName}"`);
		}

		const resources = z.array(affectedResourceSchema).parse(normalized.resources);
		return addBrowserPreview(toolName, args, resources);
	}
}
