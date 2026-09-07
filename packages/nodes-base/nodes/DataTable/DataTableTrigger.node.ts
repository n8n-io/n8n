import type {
	ITriggerFunctions,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { DATA_TABLE_RESOURCE_LOCATOR_BASE } from './common/fields';
import { getDataTableColumnIds, tableSearch } from './common/methods';

export class DataTableTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Data Table Trigger',
		name: 'dataTableTrigger',
		icon: 'node:data-table',
		iconColor: 'orange-red',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when rows in a Data Table change',
		eventTriggerDescription: '',
		defaults: {
			name: 'Data Table Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Row Inserted', value: 'rowInserted' },
					{ name: 'Row Deleted', value: 'rowDeleted' },
					{ name: 'Column Updated', value: 'columnUpdated' },
				],
				default: 'rowInserted',
			},
			DATA_TABLE_RESOURCE_LOCATOR_BASE,
			{
				displayName: 'Column Name or ID',
				name: 'columnId',
				type: 'options',
				required: true,
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getDataTableColumnIds',
					loadOptionsDependsOn: ['dataTableId.value'],
				},
				displayOptions: {
					show: {
						event: ['columnUpdated'],
					},
				},
			},
		],
	};

	methods = {
		listSearch: {
			tableSearch,
		},
		loadOptions: {
			getDataTableColumnIds,
		},
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		// The durable delivery consumer starts this node.
		return {};
	}
}
