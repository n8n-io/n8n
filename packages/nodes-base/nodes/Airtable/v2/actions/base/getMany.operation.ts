import type {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	IExecuteFunctions,
} from 'n8n-workflow';

import {
	generatePairedItemData,
	updateDisplayOptions,
	wrapData,
} from '../../../../../utils/utilities';
import { apiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: true,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Permission Level',
				name: 'permissionLevel',
				type: 'multiOptions',
				options: [
					{
						name: 'Comment',
						value: 'comment',
					},
					{
						name: 'Create',
						value: 'create',
					},
					{
						name: 'Edit',
						value: 'edit',
					},
					{
						name: 'None',
						value: 'none',
					},
					{
						name: 'Read',
						value: 'read',
					},
				],
				default: [],
				description: 'Filter the returned bases by one or more permission levels',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['base'],
		operation: ['getMany'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const returnAll = this.getNodeParameter('returnAll', 0);

	const endpoint = 'meta/bases';
	let bases: IDataObject[] = [];

	if (returnAll) {
		let offset: string | undefined = undefined;
		do {
			const responseData = await apiRequest.call(this, 'GET', endpoint);
			bases.push(...(responseData.bases as IDataObject[]));
			offset = responseData.offset;
		} while (offset);
	} else {
		const responseData = await apiRequest.call(this, 'GET', endpoint);

		const limit = this.getNodeParameter('limit', 0);
		if (limit && responseData.bases?.length) {
			bases = responseData.bases.slice(0, limit);
		}
	}

	const permissionLevel = this.getNodeParameter('options.permissionLevel', 0, []) as string[];
	if (permissionLevel.length) {
		bases = bases.filter((base) => permissionLevel.includes(base.permissionLevel as string));
	}

	const itemData = generatePairedItemData(this.getInputData().length);

	const returnData = this.helpers.constructExecutionMetaData(wrapData(bases), {
		itemData,
	});

	return returnData;
}
