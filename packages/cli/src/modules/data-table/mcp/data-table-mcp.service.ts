import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import type {
	McpDataTableValidator,
	McpToolProvider,
	McpToolRegistrationContext,
} from '@/modules/mcp/mcp-tool-provider.registry';
import { Telemetry } from '@/telemetry';

import { DataTableProxyService } from '../data-table-proxy.service';
import { toMcpDataTableValidator } from './data-table-validation';
import {
	createAddDataTableColumnTool,
	createAddDataTableRowsTool,
	createCreateDataTableTool,
	createDeleteDataTableColumnTool,
	createRenameDataTableColumnTool,
	createRenameDataTableTool,
	createSearchDataTablesTool,
} from './index';

/**
 * The data-table module's contribution to the instance MCP server: the
 * data-table tool suite plus the data-table reference validation the
 * workflow-builder tools run. Registered with the McpToolProviderRegistry on
 * module init.
 */
@Service()
export class DataTableMcpService implements McpToolProvider {
	readonly name = 'data-table';

	constructor(
		private readonly dataTableProxyService: DataTableProxyService,
		private readonly telemetry: Telemetry,
	) {}

	isAvailable() {
		return true;
	}

	registerTools({ user, registerTool }: McpToolRegistrationContext) {
		const dataTableOps = this.dataTableProxyService.makeDataTableOperationsForUser(user);

		registerTool(createSearchDataTablesTool(user, dataTableOps, this.telemetry));
		registerTool(createCreateDataTableTool(user, dataTableOps, this.telemetry));
		registerTool(createRenameDataTableTool(user, dataTableOps, this.telemetry));
		registerTool(createAddDataTableColumnTool(user, dataTableOps, this.telemetry));
		registerTool(createDeleteDataTableColumnTool(user, dataTableOps, this.telemetry));
		registerTool(createRenameDataTableColumnTool(user, dataTableOps, this.telemetry));
		registerTool(createAddDataTableRowsTool(user, dataTableOps, this.telemetry));
	}

	makeValidator(user: User): McpDataTableValidator {
		return toMcpDataTableValidator(this.dataTableProxyService.makeDataTableOperationsForUser(user));
	}
}
