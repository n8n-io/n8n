import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { getAuditLogReasonHeaders, parseDiscordError, prepareErrorData } from '../../helpers/utils';
import { discordApiRequest } from '../../transport';
import { moderationReason, moderationReasonCustom, userRLC } from '../common.description';

const properties: INodeProperties[] = [userRLC, moderationReason, moderationReasonCustom];

const displayOptions = {
	show: {
		resource: ['member'],
		operation: ['unban'],
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
	const items = this.getInputData();

	for (let i = 0; i < items.length; i++) {
		try {
			const userId = this.getNodeParameter('userId', i, undefined, {
				extractValue: true,
			}) as string;

			await discordApiRequest.call(
				this,
				'DELETE',
				`/guilds/${guildId}/bans/${userId}`,
				undefined,
				undefined,
				getAuditLogReasonHeaders.call(this, i),
			);

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray({ success: true }),
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
