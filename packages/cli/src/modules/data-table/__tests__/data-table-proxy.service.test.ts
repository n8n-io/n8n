import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';
import type { INode, Workflow } from 'n8n-workflow';

import type { DataTableAggregateService } from '../data-table-aggregate.service';
import { DataTableProxyService } from '../data-table-proxy.service';
import type { DataTableService } from '../data-table.service';

import type { InstanceWriteAccessService } from '@/services/instance-write-access.service';
import type { OwnershipService } from '@/services/ownership.service';

describe('DataTableProxyService', () => {
	const service = new DataTableProxyService(
		mock<DataTableService>(),
		mock<DataTableAggregateService>(),
		mock<OwnershipService>(),
		mock<Logger>({ scoped: () => mock<Logger>() }),
		mock<InstanceWriteAccessService>(),
	);
	const workflow = mock<Workflow>();
	const nodeOf = (type: string) => mock<INode>({ type });

	it('serves the Data table node and the node contracts', async () => {
		await expect(
			service.getDataTableAggregateProxy(workflow, nodeOf('n8n-nodes-base.dataTable'), 'p1'),
		).resolves.toBeDefined();
		await expect(
			service.getDataTableAggregateProxy(
				workflow,
				nodeOf('@n8n/nodes-base-next.dataTableRowInsert'),
				'p1',
			),
		).resolves.toBeDefined();
	});

	it('refuses other nodes', async () => {
		await expect(
			service.getDataTableAggregateProxy(workflow, nodeOf('n8n-nodes-base.httpRequest'), 'p1'),
		).rejects.toThrow('This proxy is only available for Data table nodes');
	});
});
