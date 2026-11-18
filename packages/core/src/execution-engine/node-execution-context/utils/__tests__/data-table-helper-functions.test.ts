import { mock } from 'vitest-mock-extended';
import type {
	DataTableProxyProvider,
	INode,
	IRunExecutionData,
	IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';

import { getDataTableHelperFunctions } from '../data-table-helper-functions';

describe('getDataTableHelperFunctions', () => {
	const workflow = mock<Workflow>();
	const node = mock<INode>();

	const setup = (runExecutionData?: IRunExecutionData) => {
		const provider = mock<DataTableProxyProvider>();
		const additionalData = mock<IWorkflowExecuteAdditionalData>({
			'data-table': { dataTableProxyProvider: provider },
			dataTableProjectId: 'project-1',
		});
		const helpers = getDataTableHelperFunctions(additionalData, workflow, node, runExecutionData);
		return { provider, helpers };
	};

	it('passes the user the run executes as', async () => {
		const runExecutionData = mock<IRunExecutionData>({
			executionData: { runtimeData: { executedByUserId: 'user-1' } },
		});
		const { provider, helpers } = setup(runExecutionData);

		await helpers.getDataTableProxy!('dt-1');

		expect(provider.getDataTableProxy).toHaveBeenCalledWith(
			workflow,
			node,
			'dt-1',
			'project-1',
			'user-1',
		);
	});

	it('passes no user for a run without one', async () => {
		const { provider, helpers } = setup();

		await helpers.getDataTableProxy!('dt-1');

		expect(provider.getDataTableProxy).toHaveBeenCalledWith(
			workflow,
			node,
			'dt-1',
			'project-1',
			undefined,
		);
	});
});
