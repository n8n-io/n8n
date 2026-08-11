import type { McpScope } from '@n8n/api-types';
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

/** The data-table module's MCP contribution: its tool suite plus reference validation for the builder tools. */
@Service()
export class DataTableMcpService implements McpToolProvider {
	readonly name = 'data-table';

	/** Drift-guarded against `registerTools` below. */
	readonly toolsByScope: Partial<Record<McpScope, readonly string[]>> = {
		'dataTable:read': ['search_data_tables'],
		// Writing requires finding tables, so search rides along.
		'dataTable:write': [
			'search_data_tables',
			'create_data_table',
			'rename_data_table',
			'add_data_table_column',
			'delete_data_table_column',
			'rename_data_table_column',
			'add_data_table_rows',
		],
	};

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
