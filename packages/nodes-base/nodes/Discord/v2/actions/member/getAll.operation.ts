import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { returnAllOrLimit } from '../../../../../utils/descriptions';
import { updateDisplayOptions } from '../../../../../utils/utilities';
import { createSimplifyFunction, parseDiscordError, prepareErrorData } from '../../helpers/utils';
import { discordApiRequest } from '../../transport';
import { simplifyBoolean } from '../common.description';

const properties: INodeProperties[] = [
	...returnAllOrLimit,
	{
		displayName: 'After',
		name: 'after',
		type: 'string',
		default: '',
		placeholder: 'e.g. 786953432728469534',
		description: 'The ID of the user after which to return the members',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [simplifyBoolean],
	},
];

const displayOptions = {
	show: {
		resource: ['member'],
		operation: ['getAll'],
	},
	hide: {
		authentication: ['webhook'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	guildId: string,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	const returnAll = this.getNodeParameter('returnAll', 0, false);
	const after = this.getNodeParameter('after', 0);

	const qs: IDataObject = {};

	if (!returnAll) {
		const limit = this.getNodeParameter('limit', 0);
		qs.limit = limit;
	}

	if (after) {
		qs.after = after;
	}

	let response: IDataObject[] = [];

	try {
		if (!returnAll) {
			const limit = this.getNodeParameter('limit', 0);
			qs.limit = limit;
			response = await discordApiRequest.call(
				this,
				'GET',
				`/guilds/${guildId}/members`,
				undefined,
				qs,
			);
		} else {
			let responseData;
			qs.limit = 100;

			do {
				responseData = await discordApiRequest.call(
					this,
					'GET',
					`/guilds/${guildId}/members`,
					undefined,
					qs,
				);
				if (!responseData?.length) break;
				qs.after = responseData[responseData.length - 1].user.id;
				response.push(...responseData);
			} while (responseData.length);
		}

		const simplify = this.getNodeParameter('options.simplify', 0, false) as boolean;

		if (simplify) {
			const simplifyResponse = createSimplifyFunction(['user', 'roles', 'permissions']);

			response = response.map(simplifyResponse);
		}

		const executionData = this.helpers.constructExecutionMetaData(
			this.helpers.returnJsonArray(response),
			{ itemData: { item: 0 } },
		);

		returnData.push(...executionData);
	} catch (error) {
		const err = parseDiscordError.call(this, error);

		if (this.continueOnFail()) {
			returnData.push(...prepareErrorData.call(this, err, 0));
		}

		throw err;
	}

	return returnData;
}
