import { mockInstance } from '@n8n/backend-test-utils';

import { DATA_TABLE_TOOLS } from '@/modules/mcp/mcp-scopes';

import { createTelemetry, user } from './test-utils';
import { DataTableProxyService } from '../../data-table-proxy.service';
import { DataTableMcpService } from '../data-table-mcp.service';

describe('DataTableMcpService', () => {
	it('registers exactly the data-table tools of the scope map (drift guard)', () => {
		const service = new DataTableMcpService(mockInstance(DataTableProxyService), createTelemetry());

		const registered = new Set<string>();
		service.registerTools({
			user,
			registerTool: (tool) => {
				registered.add(tool.name);
			},
			registerResource: () => {},
			allowedToolNames: undefined,
		});

		expect(registered).toEqual(new Set(DATA_TABLE_TOOLS));
	});
});
