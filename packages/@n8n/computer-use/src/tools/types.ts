import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { CreateCredentialPayload, SecretsBuffer } from '@n8n/mcp-browser';
import type { z } from 'zod';

import type { GatewayConfig, ToolGroup } from '../config';

export type { CallToolResult, CreateCredentialPayload, SecretsBuffer };

export interface McpTool {
	name: string;
	description?: string;
	inputSchema: {
		type: 'object';
		properties?: Record<string, unknown>;
		required?: string[];
	};
	annotations?: ToolAnnotations;
}

export interface ToolContext {
	/** Base filesystem directory (used by filesystem tools) */
	dir: string;
	secretsBuffer?: SecretsBuffer;
	createCredential?: (payload: CreateCredentialPayload) => Promise<{ credentialId: string }>;
}

export interface ToolAnnotations {
	/** Tool category — used to route tools to the correct sub-agent (e.g. 'browser', 'filesystem') */
	category?: string;
	/** If true, tool does not modify its environment (default: false) */
	readOnlyHint?: boolean;
	/** If true, tool may perform destructive updates (default: true) */
	destructiveHint?: boolean;
	/** If true, repeated calls with same args have no additional effect (default: false) */
	idempotentHint?: boolean;
	/** If true, tool interacts with external entities (default: true) */
	openWorldHint?: boolean;
}

export interface AffectedResource {
	toolGroup: ToolGroup;
	resource: string;
	description: string;
}

export type ResourceDecision =
	| 'allowOnce'
	| 'allowForSession'
	| 'alwaysAllow'
	| 'denyOnce'
	| 'alwaysDeny';

/** Ordered list of all ResourceDecision values — used for iteration (e.g. token generation). */
export const RESOURCE_DECISION_KEYS: ResourceDecision[] = [
	'allowOnce',
	'allowForSession',
	'alwaysAllow',
	'denyOnce',
	'alwaysDeny',
];

/** Reduced option set sent to the n8n instance UI — no persistent allow/deny to avoid fatigue. */
export const INSTANCE_RESOURCE_DECISION_KEYS: ResourceDecision[] = [
	'denyOnce',
	'allowOnce',
	'allowForSession',
];

/** Prefix used to signal a gateway confirmation is required (instance mode). */
export const GATEWAY_CONFIRMATION_REQUIRED_PREFIX = 'GATEWAY_CONFIRMATION_REQUIRED::';

export type ConfirmResourceAccess = (
	resource: AffectedResource,
) => ResourceDecision | Promise<ResourceDecision>;

export interface ToolDefinition<TSchema extends z.ZodType = z.ZodType> {
	name: string;
	description: string;
	inputSchema: TSchema;
	annotations?: ToolAnnotations;
	execute(args: z.infer<TSchema>, context: ToolContext): CallToolResult | Promise<CallToolResult>;
	getAffectedResources(
		args: z.infer<TSchema>,
		context: ToolContext,
	): AffectedResource[] | Promise<AffectedResource[]>;
}

/** Inputs a module needs to resolve availability and build its tools. */
export interface ModuleContext {
	config: GatewayConfig;
	dir: string;
}

/** Result of activating a module: available with tools (+ optional teardown), or unavailable with a reason. */
export type ModuleActivation =
	| { supported: true; tools: ToolDefinition[]; shutdown?: () => Promise<void> }
	| { supported: false; reason: string; hint?: string };

export const ModuleActivation = {
	supported(tools: ToolDefinition[], shutdown?: () => Promise<void>): ModuleActivation {
		return { supported: true, tools, ...(shutdown ? { shutdown } : {}) };
	},
	unsupported(reason: string, hint?: string): ModuleActivation {
		return { supported: false, reason, ...(hint ? { hint } : {}) };
	},
} as const;

export interface ToolModule {
	readonly name: string;
	/** Annotation used to route tools to the correct sub-agent (e.g. 'browser'). */
	readonly category: string;
	readonly permissionGroup: ToolGroup;
	/** Resolve availability once at startup; may do one-time init (native imports, sandbox setup). */
	activate(context: ModuleContext): ModuleActivation | Promise<ModuleActivation>;
}
