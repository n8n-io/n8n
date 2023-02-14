import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../../../utils/utilities';
import { discordApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Max Results',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-limit
		description: 'Maximum number of results. Too many results may slow down the query.',
	},
	{
		displayName: 'After',
		name: 'after',
		type: 'string',
		default: '',
		placeholder: 'e.g. 786953432728469534',
		description: 'The ID of the user after which to return the members',
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: false,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
];

const displayOptions = {
	show: {
		resource: ['member'],
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	guildId: string,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	const limit = this.getNodeParameter('limit', 0, 50);
	const after = this.getNodeParameter('after', 0);

	const qs: IDataObject = { limit };

	if (after) {
		qs.after = after;
	}

	// console.log(
	// 	await discordApiRequest.call(this, 'POST', `/guilds/${guildId}/roles`, {
	// 		name: 'test role',
	// 		permissions: 201326599,
	// 	}),
	// );

	try {
		let response = await discordApiRequest.call(
			this,
			'GET',
			`/guilds/${guildId}/members`,
			undefined,
			qs,
		);

		const simplify = this.getNodeParameter('simplify', 0, false);

		if (simplify) {
			const includedFields = ['user', 'roles', 'permissions'];
			response = (response as IDataObject[]).map((member) => {
				return Object.keys(member).reduce((acc, key) => {
					if (includedFields.includes(key)) {
						acc[key] = member[key];
					}
					return acc;
				}, {} as IDataObject);
			});
		}

		const executionData = this.helpers.constructExecutionMetaData(
			this.helpers.returnJsonArray(response),
			{ itemData: { item: 0 } },
		);

		returnData.push(...executionData);
	} catch (error) {
		if (this.continueOnFail()) {
			const executionErrorData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray({ error: error.message }),
				{ itemData: { item: 0 } },
			);
			returnData.push(...executionErrorData);
		}
		throw error;
	}

	return returnData;
}
