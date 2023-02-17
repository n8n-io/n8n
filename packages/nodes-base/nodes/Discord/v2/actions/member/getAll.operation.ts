import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../../../utils/utilities';
import { createSimplifyFunction, parseDiscordError, prepareErrorData } from '../../helpers/utils';
import { discordApiRequest } from '../../transport';
import { maxResultsNumber, simplifyBoolean } from '../common.description';

const properties: INodeProperties[] = [
	maxResultsNumber,
	{
		displayName: 'After',
		name: 'after',
		type: 'string',
		default: '',
		placeholder: 'e.g. 786953432728469534',
		description: 'The ID of the user after which to return the members',
	},
	simplifyBoolean,
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

	const maxResults = this.getNodeParameter('maxResults', 0, 50);
	const after = this.getNodeParameter('after', 0);

	const qs: IDataObject = { limit: maxResults };

	if (after) {
		qs.after = after;
	}

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
			const simplifyResponse = createSimplifyFunction(['user', 'roles', 'permissions']);

			response = (response as IDataObject[]).map(simplifyResponse);
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
