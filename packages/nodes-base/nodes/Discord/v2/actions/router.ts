import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { discordApiRequest } from '../transport';

import * as message from './message/Message.resource';
import * as channel from './channel/Channel.resource';
import * as member from './member/Member.resource';
import type { Discord } from './node.type';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	let returnData: INodeExecutionData[] = [];
	const guildId = (
		(await discordApiRequest.call(this, 'GET', '/users/@me/guilds')) as IDataObject[]
	)[0].id as string;

	const resource = this.getNodeParameter<Discord>('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	const googleBigQuery = {
		resource,
		operation,
	} as Discord;

	switch (googleBigQuery.resource) {
		case 'channel':
			returnData = await channel[googleBigQuery.operation].execute.call(this, guildId);
			break;
		case 'message':
			returnData = await message[googleBigQuery.operation].execute.call(this, guildId);
			break;
		case 'member':
			returnData = await member[googleBigQuery.operation].execute.call(this, guildId);
			break;
		default:
			throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known`);
	}

	return this.prepareOutputData(returnData);
}
