import type { IExecuteFunctions, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { router } from './actions/router';
import * as row from './actions/row/Row.resource';
import {
	getConditionsForColumn,
	getDataTableColumns,
	getDataTables,
	tableSearch,
} from './common/methods';

export class DataTable implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Data table',
		name: 'dataTable',
		icon: 'fa:table',
		iconColor: 'orange-red',
		group: ['input', 'transform'],
		version: 1,
		subtitle: '={{$parameter["action"]}}',
		description: 'Permanently save data across workflow executions in a table',
		defaults: {
			name: 'Data table',
		},
		usableAsTool: true,
		// We have custom logic in the frontend to ignore `hidden` for this
		// particular node type if the data-table module is enabled
		hidden: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		hints: [
			{
				message: 'The selected data table has no columns.',
				displayCondition:
					'={{ $parameter.dataTableId !== "" && $parameter?.columns?.mappingMode === "defineBelow" && !$parameter?.columns?.schema?.length }}',
				whenToDisplay: 'beforeExecution',
				location: 'ndv',
				type: 'info',
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Row',
						value: 'row',
					},
				],
				default: 'row',
			},
			...row.description,
		],
	};

	methods = {
		listSearch: {
			tableSearch,
		},
		loadOptions: {
			getDataTableColumns,
			getConditionsForColumn,
		},
		resourceMapping: {
			getDataTables,
		},
	};

	async execute(this: IExecuteFunctions) {
		return await router.call(this);
	}
}
