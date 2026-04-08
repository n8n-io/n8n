import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { parseDiscordError, prepareErrorData } from '../../helpers/utils';
import { discordApiRequest } from '../../transport';
import { roleMultiOptions, userRLC } from '../common.description';

const properties: INodeProperties[] = [userRLC, roleMultiOptions];

const displayOptions = {
	show: {
		resource: ['member'],
		operation: ['roleRemove'],
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

			const roles = this.getNodeParameter('role', i, []) as string[];

			for (const roleId of roles) {
				await discordApiRequest.call(
					this,
					'DELETE',
					`/guilds/${guildId}/members/${userId}/roles/${roleId}`,
				);
			}

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
