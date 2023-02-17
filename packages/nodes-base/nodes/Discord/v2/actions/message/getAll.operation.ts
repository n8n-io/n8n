import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../../../utils/utilities';
import { createSimplifyFunction, parseDiscordError, prepareErrorData } from '../../helpers/utils';
import { discordApiRequest } from '../../transport';
import { channelRLC, maxResultsNumber, simplifyBoolean } from '../common.description';

const properties: INodeProperties[] = [channelRLC, maxResultsNumber, simplifyBoolean];

const displayOptions = {
	show: {
		resource: ['message'],
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const items = this.getInputData();
	const simplifyResponse = createSimplifyFunction([
		'id',
		'channel_id',
		'author',
		'content',
		'timestamp',
		'type',
	]);

	for (let i = 0; i < items.length; i++) {
		try {
			const channelId = this.getNodeParameter('channelId', i, undefined, {
				extractValue: true,
			}) as string;

			const maxResults = this.getNodeParameter('maxResults', 0, 50);

			const qs: IDataObject = { limit: maxResults };

			let response = await discordApiRequest.call(
				this,
				'GET',
				`/channels/${channelId}/messages`,
				undefined,
				qs,
			);

			const simplify = this.getNodeParameter('simplify', 0, false);

			if (simplify) {
				response = (response as IDataObject[]).map(simplifyResponse);
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(response),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		} catch (error) {
			const err = parseDiscordError.call(this, error);

			if (this.continueOnFail()) {
				returnData.push(...prepareErrorData.call(this, err, i));
				continue;
			}

			throw err;
		}
	}

	return returnData;
}
