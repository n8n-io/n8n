import type { McpScope } from '@n8n/api-types';
import { MCP_INSTANCE_SCOPES } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { INode } from 'n8n-workflow';

import { CORE_TOOLS_BY_SCOPE, isMcpScope } from './mcp-scopes';
import type { RegisterResourceFn, RegisterToolFn } from './mcp.types';

/** The agents module's provider name; gates agent scopes, instructions and versioning. */
export const AGENTS_MCP_TOOL_PROVIDER = 'agents';

export type McpToolRegistrationContext = {
	user: User;
	/** Scope-filtered registrar: tools outside `allowedToolNames` are silently dropped. */
	registerTool: RegisterToolFn;
	registerResource: RegisterResourceFn;
	/** The grant's scope-derived allow-list; undefined means full access. */
	allowedToolNames: Set<string> | undefined;
};

/** MCP tool set another module contributes on its `init()`; `isAvailable` covers per-request config gates. */
export interface McpToolProvider {
	name: string;
	/** Scope→tool mapping for the tools this provider registers. */
	toolsByScope: Partial<Record<McpScope, readonly string[]>>;
	isAvailable(): boolean;
	registerTools(context: McpToolRegistrationContext): void | Promise<void>;
}

export type DataTableValidationResult =
	| { ok: true }
	| { ok: false; error: string; opIndex?: number };

/** Data-table reference checks the builder tools run before saving; absent when the data-table module is inactive. */
export interface McpDataTableValidator {
	validateReferencesForWorkflow(
		nodes: INode[],
		projectId: string,
	): Promise<DataTableValidationResult>;
	validateReferencesForUpdate(
		nodesAfterApply: INode[],
		touchedNodes: Map<string, number>,
		projectId: string,
	): Promise<DataTableValidationResult>;
}

/** Modules register their MCP tool providers here during `init()`. */
@Service()
export class McpToolProviderRegistry {
	private readonly providers = new Map<string, McpToolProvider>();

	private dataTableValidatorFactory?: (user: User) => McpDataTableValidator;

	register(provider: McpToolProvider) {
		this.providers.set(provider.name, provider);
	}

	isAvailable(name: string): boolean {
		return this.providers.get(name)?.isAvailable() ?? false;
	}

	getAvailableProviders(): McpToolProvider[] {
		return [...this.providers.values()].filter((provider) => provider.isAvailable());
	}

	/** Core scope map merged with every registered provider's contribution. */
	getToolsByScope(): Partial<Record<McpScope, readonly string[]>> {
		const providers = [...this.providers.values()];
		const merged: Partial<Record<McpScope, readonly string[]>> = {};
		for (const scope of MCP_INSTANCE_SCOPES) {
			const tools = [
				...(CORE_TOOLS_BY_SCOPE[scope] ?? []),
				...providers.flatMap((provider) => provider.toolsByScope[scope] ?? []),
			];
			if (tools.length > 0) merged[scope] = tools;
		}
		return merged;
	}

	/** Tool names the granted scopes unlock; undefined (API keys, legacy tokens) means all tools. */
	getAllowedToolNames(grantedScopes: string[] | undefined): Set<string> | undefined {
		if (grantedScopes === undefined) return undefined;

		const toolsByScope = this.getToolsByScope();
		const allowed = new Set<string>();
		for (const scope of grantedScopes) {
			if (!isMcpScope(scope)) continue;
			for (const toolName of toolsByScope[scope] ?? []) {
				allowed.add(toolName);
			}
		}

		return allowed;
	}

	registerDataTableValidator(factory: (user: User) => McpDataTableValidator) {
		this.dataTableValidatorFactory = factory;
	}

	makeDataTableValidator(user: User): McpDataTableValidator | undefined {
		return this.dataTableValidatorFactory?.(user);
	}
}
