import type { IExecuteFunctions, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { router } from './actions/router';
import * as row from './actions/row/Row.resource';
import * as table from './actions/table/Table.resource';
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
		icon: 'node:data-table',
		iconColor: 'orange-red',
		group: ['input', 'transform'],
		version: [1, 1.1],
		subtitle: '={{$parameter["action"]}}',
		description: 'Permanently save data across workflow executions in a table',
		defaults: {
			name: 'Data table',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		builderHint: {
			extraTypeDefContent: [
				{
					displayOptions: { show: { resource: ['row'], operation: ['insert'] } },
					content: `<patterns>
<pattern title="Insert with explicit schema">
const storeData = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Store Data',
    parameters: {
      resource: 'row',
      operation: 'insert',
      dataTableId: { __rl: true, mode: 'name', value: 'my-table' },
      columns: {
        mappingMode: 'defineBelow',
        value: {
          name: expr('{{ $json.name }}'),
          email: expr('{{ $json.email }}')
        },
        schema: [
          { id: 'name', displayName: 'name', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'email', displayName: 'email', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }
        ]
      }
    }
  }
});
</pattern>
</patterns>`,
				},
			],
		},
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
					{
						name: 'Table',
						value: 'table',
					},
				],
				default: 'row',
			},
			...row.description,
			...table.description,
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
