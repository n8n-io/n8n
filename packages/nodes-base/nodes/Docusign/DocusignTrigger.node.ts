import {
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';


export class DocusignTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'DocuSign Trigger',
		name: 'docusignTrigger',
		icon: 'file:docusign.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when DocuSign events occur',
		defaults: {
			name: 'DocuSign Trigger',
		},
		inputs: [],
		outputs: ['main'],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: [
					{
						name: '*',
						value: '*',
						description: 'Any time any event is triggered (Wildcard Event).',
					},
					{
						name: 'envelope-sent',
						value: 'envelope-sent',
						description: 'This event is sent when the email notification, with a link to the envelope, is sent to at least one recipient or when it is a recipient\'s turn to sign during embedded signing. The envelope remains in this state until all recipients have viewed the envelope.',
					},
					{
						name: 'envelope-delivered',
						value: 'envelope-delivered',
						description: 'This event is sent when all recipients have opened the envelope through the DocuSign signing website. This does not signify an email delivery of an envelope.',
					},
					{
						name: 'envelope-completed',
						value: 'envelope-completed',
						description: 'The envelope has been completed by all the recipients.',
					},
					{
						name: 'envelope-declined',
						value: 'envelope-declined',
						description: 'The envelope has been declined by one of the recipients.',
					},
					{
						name: 'envelope-voided',
						value: 'envelope-voided',
						description: 'The envelope has been voided by the sender or has expired. The void reason indicates whether the envelope was manually voided or expired.',
					},
					{
						name: 'envelope-resent',
						value: 'envelope-resent',
						description: 'Sent when the envelope is resent within the web application or via the Envelopes API call.',
					},
					{
						name: 'envelope-corrected',
						value: 'envelope-corrected',
						description: 'Sent when the envelope is corrected within the web application or via any of the Envelopes/EnvelopesRecipients API calls.',
					},
					{
						name: 'envelope-purge',
						value: 'envelope-purge',
						description: 'Sent when the envelope is queued to be purged within the web application or via the Update Envelopes API call.',
					},
					{
						name: 'envelope-deleted',
						value: 'envelope-deleted',
						description: 'This event is sent after an already-sent envelope is deleted within the web application.',
					},
					{
						name: 'envelope-discard',
						value: 'envelope-discard',
						description: 'Sent when an envelope in a created or draft state is deleted within the web application or discarded within the tagging UI.',
					},
					{
						name: 'recipient-sent',
						value: 'recipient-sent',
						description: 'This event is sent when an email notification is sent to the recipient signifying that it is their turn to sign an envelope.',
					},
					{
						name: 'recipient-autoresponded',
						value: 'recipient-autoresponded',
						description: 'Sent when DocuSign gets notification that an email delivery has failed. The delivery failure could be for a number of reasons, such as a bad email address or that the recipient’s email system auto-responds to the email from DocuSign.',
					},
					{
						name: 'recipient-delivered',
						value: 'recipient-delivered',
						description: 'Sent when the recipient has viewed the document(s) in an envelope through the DocuSign signing web site. This does not signify an email delivery of an envelope.',
					},
					{
						name: 'recipient-completed',
						value: 'recipient-completed',
						description: 'Sent when the recipient has completed their actions for the envelope, typically (but not always) by signing.',
					},
					{
						name: 'recipient-declined',
						value: 'recipient-declined',
						description: 'Sent when the recipient declines to sign the document(s) in the envelope.',
					},
					{
						name: 'recipient-authenticationfailed',
						value: 'recipient-authenticationfailed',
						description: 'Sent when the recipient fails an authentication check. In cases where a recipient has multiple attempts to pass a check, it means that the recipient failed all the attempts.',
					},
					{
						name: 'recipient-resent',
						value: 'recipient-resent',
						description: 'Sent when the recipient selects finish within the web application on an Envelope. Only available in JSON SIM message format.',
					},
					{
						name: 'recipient-delegate',
						value: 'recipient-delegate',
						description: 'Sent after a Delegation rule is in place and when a delegated signer is sent an envelope within the web application or the API.',
					},
					{
						name: 'recipient-reassign',
						value: 'recipient-reassign',
						description: 'Sent when the envelope is reassigned by a recipient within the web application.',
					},
					{
						name: 'recipient-finish-later',
						value: 'recipient-finish-later',
						description: 'Sent when the recipient selects finish within the web application on an Envelope.',
					},
					{
						name: 'template-created',
						value: 'template-created',
						description: 'Sent when a Template is created within the web application or via the create Templates API call.',
					},
					{
						name: 'templated-modified',
						value: 'templated-modified',
						description: 'Sent when a Template is modified within the web application or via the update Templates API call.',
					},
					{
						name: 'templated-deleted',
						value: 'templated-deleted',
						description: 'Sent when a Template is deleted within the web application or via the recycle bin API call. ',
					},
					{
						name: 'click-agreed',
						value: 'click-agreed',
						description: 'Sent after a recipient accepts a Clickwrap.',
					},
					{
						name: 'click-declined',
						value: 'click-declined',
						description: 'Sent after a recipient declines a Clickwrap.',
					},
				],
				required: true,
				default: [],
				description: 'The events to listen to.',
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {

		const returnData: IDataObject[] = [];

		returnData.push(
			{
				body: this.getBodyData(),
				headers: this.getHeaderData(),
				query: this.getQueryData(),
			},
		);

		return {
			workflowData: [
				this.helpers.returnJsonArray(returnData),
			],
		};
	}
}
