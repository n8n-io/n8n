import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { configureWaitTillDate } from '../../../../../utils/sendAndWait/configureWaitTillDate.util';
import { getSendAndWaitProperties } from '../../../../../utils/sendAndWait/utils';
import {
	createSendAndWaitMessageBody,
	parseDiscordError,
	sendDiscordMessage,
} from '../../helpers/utils';
import { sendToProperties } from '../common.description';

export const description: INodeProperties[] = getSendAndWaitProperties(
	sendToProperties,
	'message',
	undefined,
	{
		noButtonStyle: true,
		defaultApproveLabel: '✓ Approve',
		defaultDisapproveLabel: '✗ Decline',
	},
).filter((p) => p.name !== 'subject');

export async function execute(
	this: IExecuteFunctions,
	guildId: string,
	userGuilds: IDataObject[],
): Promise<INodeExecutionData[]> {
	const items = this.getInputData();

	const isOAuth2 = this.getNodeParameter('authentication', 0) === 'oAuth2';

	try {
		await sendDiscordMessage.call(this, {
			guildId,
			userGuilds,
			isOAuth2,
			body: createSendAndWaitMessageBody(this),
		});
	} catch (error) {
		const err = parseDiscordError.call(this, error, 0);

		if (this.continueOnFail()) {
			return [{ json: { error: err.message } }];
		}

		throw err;
	}

	const waitTill = configureWaitTillDate(this);

	await this.putExecutionToWait(waitTill);
	return items;
}
