import type { IExecuteFunctions } from 'n8n-core';
import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../../../utils/utilities';
import { discordApiRequest } from '../../transport';
import { roleMultiOptions, userRLC } from '../common.description';

const properties: INodeProperties[] = [userRLC, roleMultiOptions];

const displayOptions = {
	show: {
		resource: ['member'],
		operation: ['roleRemove'],
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
