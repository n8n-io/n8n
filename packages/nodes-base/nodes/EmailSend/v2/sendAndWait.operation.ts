import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { fromEmailProperty, toEmailProperty } from './descriptions';
import { configureTransport } from './utils';
import { createEmailBody } from '../../../utils/sendAndWait/email-templates';
import {
	configureWaitTillDate,
	createButton,
	getSendAndWaitConfig,
	getSendAndWaitProperties,
} from '../../../utils/sendAndWait/utils';

export const description: INodeProperties[] = getSendAndWaitProperties(
	[fromEmailProperty, toEmailProperty],
	'email',
);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const fromEmail = this.getNodeParameter('fromEmail', 0) as string;
	const toEmail = this.getNodeParameter('toEmail', 0) as string;

	const config = getSendAndWaitConfig(this);
	const buttons: string[] = [];
	for (const option of config.options) {
		buttons.push(createButton(config.url, option.label, option.value, option.style));
	}

	const instanceId = this.getInstanceId();

	const htmlBody = createEmailBody(config.message, buttons.join('\n'), instanceId);

	const mailOptions: IDataObject = {
		from: fromEmail,
		to: toEmail,
		subject: config.title,
		html: htmlBody,
	};

	const credentials = await this.getCredentials('smtp');
	const transporter = configureTransport(credentials, {});

	await transporter.sendMail(mailOptions);

	const waitTill = configureWaitTillDate(this);

	await this.putExecutionToWait(waitTill);
	return [this.getInputData()];
}
