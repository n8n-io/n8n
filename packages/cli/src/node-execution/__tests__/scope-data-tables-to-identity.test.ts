import { mockInstance } from '@n8n/backend-test-utils';
import { DataTableService } from '@n8n/backend-module-data-table';
import type { SecurityContext } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';
import type {
	DataTableProxyProvider,
	INode,
	IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';

import { RuntimeAccessService } from '@/services/runtime-access.service';

import { scopeDataTablesToIdentity } from '../ephemeral-node-executor';

describe('scopeDataTablesToIdentity', () => {
	const dataTableService = mockInstance(DataTableService);
	const runtimeAccess = mockInstance(RuntimeAccessService);
	const security = mock<SecurityContext>({ authMethod: 'agent-run' });
	const workflow = mock<Workflow>();

	const setup = () => {
		const provider = mock<DataTableProxyProvider>();
		const additionalData = mock<IWorkflowExecuteAdditionalData>({
			'data-table': { dataTableProxyProvider: provider },
		});
		scopeDataTablesToIdentity(additionalData, security, 'home');
		const scoped = additionalData['data-table']?.dataTableProxyProvider;
		if (!scoped) throw new Error('Expected a provider');
		return { provider, scoped };
	};

	const node = (parameters: INode['parameters']) => mock<INode>({ parameters });

	beforeEach(() => vi.clearAllMocks());

	it('opens a table of another project when the agent may write rows there', async () => {
		const { provider, scoped } = setup();
		dataTableService.getProjectIdForDataTable.mockResolvedValue('sales');
		runtimeAccess.canUse.mockResolvedValue(true);
		const insert = node({ resource: 'row', operation: 'insert' });

		await scoped.getDataTableProxy(workflow, insert, 'table-1');

		expect(runtimeAccess.canUse).toHaveBeenCalledWith(security, {
			type: 'dataTable',
			projectId: 'sales',
			access: 'write',
		});
		expect(provider.getDataTableProxy).toHaveBeenCalledWith(workflow, insert, 'table-1', 'sales');
	});

	it('asks only for read access for a read operation', async () => {
		const { scoped } = setup();
		dataTableService.getProjectIdForDataTable.mockResolvedValue('sales');
		runtimeAccess.canUse.mockResolvedValue(true);

		await scoped.getDataTableProxy(workflow, node({ operation: 'get' }), 'table-1');

		expect(runtimeAccess.canUse).toHaveBeenCalledWith(
			security,
			expect.objectContaining({ access: 'read' }),
		);
	});

	it('refuses a table the agent cannot use', async () => {
		const { provider, scoped } = setup();
		dataTableService.getProjectIdForDataTable.mockResolvedValue('sales');
		runtimeAccess.canUse.mockResolvedValue(false);

		await expect(
			scoped.getDataTableProxy(workflow, node({ operation: 'insert' }), 'table-1'),
		).rejects.toThrow('The agent cannot use this data table');
		expect(provider.getDataTableProxy).not.toHaveBeenCalled();
	});

	it('keeps table operations in the own project of the agent', async () => {
		const { scoped } = setup();
		dataTableService.getProjectIdForDataTable.mockResolvedValue('sales');
		runtimeAccess.canUse.mockResolvedValue(true);

		await expect(
			scoped.getDataTableProxy(workflow, node({ resource: 'table', operation: 'delete' }), 't-1'),
		).rejects.toThrow('The agent cannot use this data table');
	});
});
