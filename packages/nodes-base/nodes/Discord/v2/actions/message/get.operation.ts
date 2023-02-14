import type { IExecuteFunctions } from 'n8n-core';
import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../../../utils/utilities';
import { createSimplifyFunction } from '../../helpers/utils';
import { discordApiRequest } from '../../transport';
import { channelRLC, messageIdString, simplifyBoolean } from '../common.description';

const properties: INodeProperties[] = [channelRLC, messageIdString, simplifyBoolean];

const displayOptions = {
	show: {
		resource: ['message'],
		operation: ['get'],
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

			const messageId = this.getNodeParameter('messageId', i) as string;

			let response = await discordApiRequest.call(
				this,
				'GET',
				`/channels/${channelId}/messages/${messageId}`,
			);

			const simplify = this.getNodeParameter('simplify', i) as boolean;

			if (simplify) {
				response = simplifyResponse(response);
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(response),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		} catch (error) {
			if (this.continueOnFail()) {
				const executionErrorData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({ error: error.message }),
					{ itemData: { item: i } },
				);
				returnData.push(...executionErrorData);
				continue;
			}
			throw error;
		}
	}

	return returnData;
}
