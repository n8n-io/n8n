import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { INode } from 'n8n-workflow';

import type { RegisterResourceFn, RegisterToolFn } from './mcp.types';

/** Provider name the agents module registers under; the MCP server checks it
 * to decide whether agent scopes, instructions and versioning apply. */
export const AGENTS_MCP_TOOL_PROVIDER = 'agents';

export type McpToolRegistrationContext = {
	user: User;
	/** Scope-filtered registrar (see McpService.createToolRegistrar): tools not
	 * covered by the grant's `allowedToolNames` are silently dropped. */
	registerTool: RegisterToolFn;
	registerResource: RegisterResourceFn;
	/** The grant's scope-derived allow-list; undefined means full access. */
	allowedToolNames: Set<string> | undefined;
};

/**
 * MCP tool set contributed by another backend module. Registered during the
 * owning module's `init()`, so a provider only exists when its module is
 * active — `isAvailable` covers config-level gates evaluated per request.
 */
export interface McpToolProvider {
	name: string;
	isAvailable(): boolean;
	registerTools(context: McpToolRegistrationContext): void | Promise<void>;
}

export type DataTableValidationResult =
	| { ok: true }
	| { ok: false; error: string; opIndex?: number };

/**
 * Data-table reference checks the workflow-builder tools run before saving a
 * workflow, implemented by the data-table module so mcp does not depend on
 * data-table internals. Absent when the data-table module is inactive, in
 * which case the builder tools skip the check.
 */
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

/**
 * Modules register their MCP tool providers here during `init()`. The MCP
 * server is rebuilt per request, long after all modules have initialized, so
 * registration order relative to serving never matters.
 */
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

	registerDataTableValidator(factory: (user: User) => McpDataTableValidator) {
		this.dataTableValidatorFactory = factory;
	}

	makeDataTableValidator(user: User): McpDataTableValidator | undefined {
		return this.dataTableValidatorFactory?.(user);
	}
}
