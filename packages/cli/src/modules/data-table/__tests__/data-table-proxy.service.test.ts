import type { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { packageOf, versionsOf } from '@n8n/nodes-integrations';
import { mock } from 'vitest-mock-extended';
import type { INode, Workflow } from 'n8n-workflow';

import type { DataTableAggregateService } from '../data-table-aggregate.service';
import { DataTableProxyService } from '../data-table-proxy.service';
import type { DataTableService } from '../data-table.service';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { ContractNodeLoader } from '@/node-contracts-registry';
import type { InstanceWriteAccessService } from '@/services/instance-write-access.service';
import type { OwnershipService } from '@/services/ownership.service';

describe('DataTableProxyService', () => {
	const contracts = new ContractNodeLoader(
		[],
		[],
		async () => ({ versions: async () => new Map(), credentials: async () => new Map() }),
		[],
		undefined,
		undefined,
		packageOf('dataTable.row.insert'),
	);
	const service = new DataTableProxyService(
		mock<DataTableService>(),
		mock<DataTableAggregateService>(),
		mock<OwnershipService>(),
		mock<Logger>({ scoped: () => mock<Logger>() }),
		mock<InstanceWriteAccessService>(),
		Object.assign(mock<LoadNodesAndCredentials>(), {
			loaders: { [contracts.packageName]: contracts },
		}),
	);
	const workflow = mock<Workflow>();
	const nodeOf = (type: string, typeVersion = 1) => mock<INode>({ type, typeVersion });
	const majorOf = (id: string) => versionsOf(id)[0]?.manifest.contract.version ?? 0;

	beforeAll(async () => await contracts.loadAll(), 30_000);

	it('serves the Data table node and a contract node whose manifest imports data tables', async () => {
		await expect(
			service.getDataTableAggregateProxy(workflow, nodeOf('n8n-nodes-base.dataTable'), 'p1'),
		).resolves.toBeDefined();
		await expect(
			service.getDataTableAggregateProxy(
				workflow,
				nodeOf('@n8n/nodes-core.dataTableRowInsert', majorOf('dataTable.row.insert')),
				'p1',
			),
		).resolves.toBeDefined();
	});

	it('refuses a contract node whose manifest does not import data tables', async () => {
		await expect(
			service.getDataTableAggregateProxy(
				workflow,
				nodeOf('@n8n/nodes-core.httpRequestGet', majorOf('httpRequest.get')),
				'p1',
			),
		).rejects.toThrow('This proxy is only available for Data table nodes');
		await expect(
			service.getDataTableAggregateProxy(
				workflow,
				nodeOf('@n8n/nodes-core.dataTableRowInsert', 99),
				'p1',
			),
		).rejects.toThrow('This proxy is only available for Data table nodes');
	});

	it('refuses a contract node whose manifest imports data tables with node contracts disabled', async () => {
		const { instanceAi } = Container.get(GlobalConfig);
		instanceAi.nodeContractsEnabled = false;
		try {
			await expect(
				service.getDataTableAggregateProxy(
					workflow,
					nodeOf('@n8n/nodes-core.dataTableRowInsert', majorOf('dataTable.row.insert')),
					'p1',
				),
			).rejects.toThrow('This proxy is only available for Data table nodes');
		} finally {
			instanceAi.nodeContractsEnabled = true;
		}
	});

	it('refuses other nodes', async () => {
		await expect(
			service.getDataTableAggregateProxy(workflow, nodeOf('n8n-nodes-base.httpRequest'), 'p1'),
		).rejects.toThrow('This proxy is only available for Data table nodes');
	});
});
