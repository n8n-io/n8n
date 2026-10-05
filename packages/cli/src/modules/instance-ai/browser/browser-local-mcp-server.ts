import { zodSchemaToJsonSchema } from '@n8n/ai-utilities/json-schema';
import type {
	InstanceAiPermissionMode,
	InstanceGatewayResourceDecision,
	McpTool,
	McpToolCallRequest,
	McpToolCallResult,
} from '@n8n/api-types';
import {
	GATEWAY_CONFIRMATION_REQUIRED_PREFIX,
	mcpToolCallResultSchema,
	mcpToolSchema,
} from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { DomainAccessTracker, LocalMcpServer } from '@n8n/instance-ai';
import type {
	AffectedResource,
	BrowserToolkit,
	ToolContext,
	ToolDefinition,
} from '@n8n/mcp-browser';

export interface BrowserDomainGate {
	tracker: DomainAccessTracker;
	runId: string;
	/** Governs domain access — every browser tool whose affected resource is a host. */
	permissionMode?: InstanceAiPermissionMode;
	/**
	 * Governs `browser_create_credential`, which reports `credentials` rather than a host.
	 * Writing a credential to the instance is a different kind of action from reading a
	 * page, so it carries its own permission.
	 */
	createCredentialPermissionMode?: InstanceAiPermissionMode;
}

const NO_DOMAIN = 'browser';

export class BrowserLocalMcpServer implements LocalMcpServer {
	private readonly toolsByName = new Map<string, ToolDefinition>();

	private readonly mcpTools: McpTool[] = [];

	private gate?: BrowserDomainGate;

	constructor(
		toolkit: BrowserToolkit,
		private readonly toolContext: ToolContext,
		private readonly logger: Logger,
	) {
		for (const tool of toolkit.tools) {
			const candidate = {
				name: tool.name,
				description: tool.description,
				inputSchema: zodSchemaToJsonSchema(tool.inputSchema),
				annotations: { category: 'browser' },
			};
			const parsed = mcpToolSchema.safeParse(candidate);
			if (!parsed.success) {
				this.logger.warn('Skipping browser tool with unsupported input schema', {
					tool: tool.name,
				});
				continue;
			}

			this.toolsByName.set(tool.name, tool);
			this.mcpTools.push(parsed.data);
		}
	}

	setDomainGate(gate: BrowserDomainGate | undefined): void {
		this.gate = gate;
		// `browser_act` drives the adapter directly, so its actions never pass
		// through callTool and never meet the gate below. Give it the same two
		// decisions the gate makes: whether a host is already allowed, and how to
		// ask when it is not.
		this.toolContext.isHostAllowed = gate ? (host: string) => hostAllowed(gate, host) : undefined;
		this.toolContext.requestHostApproval = gate
			? (host: string) => requestHostApproval(gate, host)
			: undefined;
	}

	getAvailableTools(): McpTool[] {
		return this.mcpTools;
	}

	getToolsByCategory(category: string): McpTool[] {
		return category === 'browser' ? this.mcpTools : [];
	}

	async callTool(req: McpToolCallRequest): Promise<McpToolCallResult> {
		const tool = this.toolsByName.get(req.name);
		if (!tool) {
			return errorResult(`Unknown browser tool: ${req.name}`);
		}

		try {
			const { _confirmation, ...rawArgs } = req.arguments;
			const args: unknown = tool.inputSchema.parse(rawArgs);

			const gateResult = await this.gateAccess(tool, args, _confirmation);
			if (gateResult) {
				return gateResult;
			}

			const result = await tool.execute(args, this.toolContext);
			const parsed = mcpToolCallResultSchema.safeParse(result);
			if (parsed.success) {
				return parsed.data;
			}

			return {
				content: [{ type: 'text', text: JSON.stringify(result.content) }],
				...(result.isError === true ? { isError: true } : {}),
			};
		} catch (error) {
			return errorResult(error instanceof Error ? error.message : String(error));
		}
	}

	private async gateAccess(
		tool: ToolDefinition,
		args: unknown,
		confirmation: unknown,
	): Promise<McpToolCallResult | undefined> {
		const gate = this.gate;
		if (!gate) {
			return undefined;
		}

		const affected = await this.affectedResource(tool, args);
		if (!affected || affected.resource === NO_DOMAIN) {
			return undefined;
		}

		return affected.kind === 'credential-write'
			? gateCredentialCreation(gate, affected, confirmation)
			: await gateDomainAccess(gate, affected, confirmation);
	}

	private async affectedResource(
		tool: ToolDefinition,
		args: unknown,
	): Promise<AffectedResource | undefined> {
		try {
			const resources = await tool.getAffectedResources(args, this.toolContext);
			return resources[0];
		} catch {
			return undefined;
		}
	}
}

/**
 * Mirrors `gateDomainAccess`'s verdict without asking for anything.
 *
 * The admin modes have to be part of it: under `always_allow` the gate never
 * consults the tracker, so a predicate that only asked the tracker would refuse
 * hosts the gate would have let through.
 */
function hostAllowed(gate: BrowserDomainGate, host: string): boolean {
	if (gate.permissionMode === 'blocked') return false;
	if (gate.permissionMode === 'always_allow') return true;
	return gate.tracker.isHostAllowed(host, gate.runId);
}

/**
 * The confirmation for a host reached part-way through a `browser_act` run.
 *
 * Same payload the per-call gate produces, so the tool wrapper suspends and
 * resumes exactly as it does for a single browser tool. On resume the loop
 * starts again from the page it left off on, which is why the goal it takes is
 * the remaining goal rather than a step.
 */
function requestHostApproval(gate: BrowserDomainGate, host: string): McpToolCallResult {
	if (gate.permissionMode === 'blocked') {
		return errorResult('Browser access blocked by admin');
	}
	return confirmationRequiredResult(
		{
			toolGroup: 'browser',
			kind: 'host',
			resource: host,
			description: `Browser: ${host}`,
		},
		['denyOnce', 'allowOnce', 'allowForSession'],
	);
}

async function gateDomainAccess(
	gate: BrowserDomainGate,
	affected: AffectedResource,
	confirmation: unknown,
): Promise<McpToolCallResult | undefined> {
	const host = affected.resource;

	if (typeof confirmation === 'string') {
		switch (confirmation) {
			case 'allowForSession':
				await gate.tracker.approveDomain(host);
				return undefined;
			case 'allowOnce':
				gate.tracker.approveOnce(gate.runId, host);
				return undefined;
			default:
				return errorResult('Access denied by user');
		}
	}

	if (gate.permissionMode === 'blocked') {
		return errorResult('Browser access blocked by admin');
	}
	if (gate.permissionMode !== 'always_allow' && !gate.tracker.isHostAllowed(host, gate.runId)) {
		return confirmationRequiredResult(affected, ['denyOnce', 'allowOnce', 'allowForSession']);
	}
	return undefined;
}

/**
 * Credential creation is confirmed per call against its own permission: there is no
 * session-wide option, and the domain tracker plays no part in the decision.
 */
function gateCredentialCreation(
	gate: BrowserDomainGate,
	affected: AffectedResource,
	confirmation: unknown,
): McpToolCallResult | undefined {
	if (typeof confirmation === 'string') {
		return confirmation === 'allowOnce' ? undefined : errorResult('Access denied by user');
	}

	if (gate.createCredentialPermissionMode === 'blocked') {
		return errorResult('Credential creation blocked by admin');
	}
	if (gate.createCredentialPermissionMode !== 'always_allow') {
		return confirmationRequiredResult(affected, ['denyOnce', 'allowOnce']);
	}
	return undefined;
}

function confirmationRequiredResult(
	affected: AffectedResource,
	options: InstanceGatewayResourceDecision[],
): McpToolCallResult {
	const payload = {
		toolGroup: affected.toolGroup,
		resource: affected.resource,
		description: affected.description,
		options,
	};
	return {
		content: [
			{ type: 'text', text: `${GATEWAY_CONFIRMATION_REQUIRED_PREFIX}${JSON.stringify(payload)}` },
		],
		isError: true,
	};
}

function errorResult(message: string): McpToolCallResult {
	return { content: [{ type: 'text', text: message }], isError: true };
}
