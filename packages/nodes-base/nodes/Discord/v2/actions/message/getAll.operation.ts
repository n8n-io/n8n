import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { updateDisplayOptions } from '../../../../../utils/utilities';
import { createSimplifyFunction, parseDiscordError, prepareErrorData } from '../../helpers/utils';
import { discordApiRequest } from '../../transport';
import { channelRLC, simplifyBoolean } from '../common.description';
import { returnAllOrLimit } from '../../../../../utils/descriptions';

const properties: INodeProperties[] = [
	channelRLC,
	...returnAllOrLimit,
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [simplifyBoolean],
	},
];

const displayOptions = {
	show: {
		resource: ['message'],
		operation: ['getAll'],
	},
	hide: {
		authentication: ['webhook'],
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

			const returnAll = this.getNodeParameter('returnAll', i, false);

			const qs: IDataObject = {};

			if (!returnAll) {
				const limit = this.getNodeParameter('limit', i);
				qs.limit = limit;
			}

			let response = await discordApiRequest.call(
				this,
				'GET',
				`/channels/${channelId}/messages`,
				undefined,
				qs,
			);

			const simplify = this.getNodeParameter('options.simplify', i, false) as boolean;

			if (simplify) {
				response = (response as IDataObject[]).map(simplifyResponse);
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(response),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		} catch (error) {
			const err = parseDiscordError.call(this, error, i);

			if (this.continueOnFail()) {
				returnData.push(...prepareErrorData.call(this, err, i));
				continue;
			}

			throw err;
		}
	}

	return returnData;
}
