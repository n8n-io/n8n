import {IWebhookFunctions} from 'n8n-core';

import {IDataObject, INodeType, INodeTypeDescription, IWebhookResponseData} from 'n8n-workflow';
import {convertEventPayload} from './helpers';
import {ErrorMessageBuilder, EventChecker, SourceValidator, TokenValidator} from './validators';

export class GllueTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Gllue Trigger',
		name: 'gllueTrigger',
		icon: 'file:gllue.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Handle Gllue events via webhooks',
		defaults: {
			name: 'Gllue Trigger',
			color: '#6ad7b9',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'gllueTriggerApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				isFullPath: true,
				responseMode: 'onReceived',
				path: '={{$parameter["path"]}}',
			},
		],
		properties: [
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				default: '',
				placeholder: 'webhook',
				required: true,
				description: 'The path to listen to.',
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				required: true,
				default: '',
				options: [
					{
						name: 'CV Sent',
						value: 'cvsent',
					},
					{
						name: 'Interview',
						value: 'clientinterview',
					},
				],
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const credentials = (await this.getCredentials('gllueTriggerApi')) as IDataObject;
		const expectedToken = credentials.apiToken as string;
		const req = this.getRequestObject();
		const token = req.query.token as string;
		const source = req.query.source as string;
		const resp = this.getResponseObject();
		const realm = 'Webhook';

		const tokenValidator = new TokenValidator(token, expectedToken);
		if (tokenValidator.isMissing()) {
			const builder = new ErrorMessageBuilder(resp, realm, 401);
			return builder.handle();
		}
		if (tokenValidator.isWrong()) {
			const builder = new ErrorMessageBuilder(resp, realm, 403);
			return builder.handle();
		}

		const validator = new SourceValidator(req.query);
		validator.check();

		const item = convertEventPayload(req.body);
		const event = this.getNodeParameter('event') as string;
		// @ts-ignore
		if (EventChecker.isValid(item.info.trigger_model_name, event)) {
			const data = Object.assign(item, {source});
			return {workflowData: [this.helpers.returnJsonArray(data)]};
		} else {
			const builder = new ErrorMessageBuilder(resp, realm, 202);
			return builder.handle();
		}
	}
}
