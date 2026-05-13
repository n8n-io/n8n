import type { IExecuteFunctions, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { router } from './actions/router';
import * as board from './actions/board/Board.resource';
import * as item from './actions/item/Item.resource';
import * as status from './actions/status/Status.resource';
import { boardSearch, getBoardStatuses } from './common/methods';

export class Board implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Board',
		name: 'board',
		icon: 'file:board.svg',
		group: ['input', 'transform'],
		version: [1],
		subtitle: '={{$parameter["action"]}}',
		description: 'Manage kanban boards, items, and statuses',
		defaults: {
			name: 'Board',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Board',
						value: 'board',
					},
					{
						name: 'Item',
						value: 'item',
					},
					{
						name: 'Status',
						value: 'status',
					},
				],
				default: 'item',
			},
			...board.description,
			...item.description,
			...status.description,
		],
	};

	methods = {
		listSearch: {
			boardSearch,
		},
		loadOptions: {
			getBoardStatuses,
		},
	};

	async execute(this: IExecuteFunctions) {
		return await router.call(this);
	}
}
