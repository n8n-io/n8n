import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError, SEND_AND_WAIT_OPERATION } from 'n8n-workflow';

import * as channel from './channel';
import * as member from './member';
import * as message from './message';
import type { Discord } from './node.type';
import * as webhook from './webhook';
import { configureWaitTillDate } from '../../../../utils/sendAndWait/configureWaitTillDate.util';
import { checkAccessToGuild } from '../helpers/utils';
import { discordApiRequest } from '../transport';

export async function router(this: IExecuteFunctions) {
	let returnData: INodeExecutionData[] = [];

	let resource = 'webhook';
	//resource parameter is hidden when authentication is set to webhook
	//prevent error when getting resource parameter
	try {
		resource = this.getNodeParameter<Discord>('resource', 0);
	} catch (error) {}
	const operation = this.getNodeParameter('operation', 0);

	let guildId = '';
	let userGuilds: IDataObject[] = [];

	if (resource !== 'webhook') {
		guildId = this.getNodeParameter('guildId', 0, '', {
			extractValue: true,
		}) as string;

		const isOAuth2 = this.getNodeParameter('authentication', 0, '') === 'oAuth2';

		if (isOAuth2) {
			userGuilds = (await discordApiRequest.call(
				this,
				'GET',
				'/users/@me/guilds',
			)) as IDataObject[];

			checkAccessToGuild(this.getNode(), guildId, userGuilds);
		}
	}

	const discord = {
		resource,
		operation,
	} as Discord;

	if (discord.resource === 'message' && discord.operation === SEND_AND_WAIT_OPERATION) {
		returnData = await message[discord.operation].execute.call(this, guildId, userGuilds);

		const waitTill = configureWaitTillDate(this);

		await this.putExecutionToWait(waitTill);
		return [returnData];
	}

	switch (discord.resource) {
		case 'channel':
			returnData = await channel[discord.operation].execute.call(this, guildId, userGuilds);
			break;
		case 'message':
			returnData = await message[discord.operation].execute.call(this, guildId, userGuilds);
			break;
		case 'member':
			returnData = await member[discord.operation].execute.call(this, guildId);
			break;
		case 'webhook':
			returnData = await webhook[discord.operation].execute.call(this);
			break;
		default:
			throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known`);
	}

	return [returnData];
}
