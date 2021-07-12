import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeProperties,
	IWebhookFunctions,
	NodeApiError,
} from 'n8n-workflow';

import {
	upperFirst,
} from 'lodash';

export async function webexApiRequest(this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions | IWebhookFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	let options: OptionsWithUri = {
		method,
		body,
		qs,
		uri: uri || `https://webexapis.com/v1${resource}`,
		json: true,
	};
	try {
		if (Object.keys(option).length !== 0) {
			options = Object.assign({}, options, option);
		}
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		if (Object.keys(qs).length === 0) {
			delete options.qs;
		}
		console.log(options);
		//@ts-ignore
		return await this.helpers.requestOAuth2.call(this, 'ciscoWebexOAuth2Api', options, { tokenType: 'Bearer' });
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function webexApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions, propertyName: string, method: string, endpoint: string, body: any = {}, query: IDataObject = {}, options: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;
	let uri: string | undefined;
	query.max = 100;
	do {
		responseData = await webexApiRequest.call(this, method, endpoint, body, query, uri, { resolveWithFullResponse: true, ...options });
		if (responseData.headers.link) {
			uri = responseData.headers['link'].split(';')[0].replace('<', '').replace('>', '');
		}
		returnData.push.apply(returnData, responseData.body[propertyName]);
	} while (
		responseData.headers['link'] !== undefined &&
		responseData.headers['link'].includes('rel="next"')
	);
	return returnData;
}

export function getEvents() {
	const resourceEvents: { [key: string]: string[] } = {
		'attachmentAction': ['created', 'deleted', 'updated', '*'],
		'membership': ['created', 'deleted', 'updated', '*'],
		'message': ['created', 'deleted', 'updated', '*'],
		'room': ['created', 'deleted', 'updated', '*'],
		'meeting': ['created', 'deleted', 'updated', 'started', 'ended', '*'],
		'recording': ['created', 'deleted', 'updated', '*'],
		'telephonyCall': ['created', 'deleted', 'updated'],
		'*': ['created', 'updated', 'deleted', '*'],
	};

	const elements: INodeProperties[] = [];

	for (const resource of Object.keys(resourceEvents)) {
		elements.push({
			displayName: 'Event',
			name: 'event',
			type: 'options',
			displayOptions: {
				show: {
					resource: [
						(resource === '*') ? 'all' : resource,
					],
				},
			},
			options: resourceEvents[resource].map((event) => ({ value: (event === '*' ? 'all' : event), name: upperFirst(event) })),
			default: '',
			required: true,
		});
	}
	return elements;
}

export function mapResource(event: string) {
	return ({
		'attachmentAction': 'attachmentActions',
		'membership': 'memberships',
		'message': 'messages',
		'room': 'rooms',
		'meeting': 'meetings',
		'recording': 'recordings',
		'telephonyCall': 'telephony_calls',
		'all': 'all',
	} as { [key: string]: string })[event];
}

export function getAttachemnts(attachements: IDataObject[]) {
	const _attachments: IDataObject[] = [];
	for (const attachment of attachements) {
		const body: IDataObject[] = [];
		const actions: IDataObject[] = [];
		for (const element of (attachment?.elementsUi as IDataObject).elementValues as IDataObject[] || []) {
			const { type, properties } = element as { type: string, properties: IDataObject };
			if (type.startsWith('input')) {
				body.push({ type: `Input.${upperFirst(type.replace('input', ''))}`, ...properties });
			} else {
				body.push({ type: upperFirst(type), ...properties });
			}
		}
		for (const action of (attachment?.actionsUi as IDataObject).actionValues as IDataObject[] || []) {
			const { type, properties } = action as { type: string, properties: IDataObject };
			actions.push({ type: `Action.${upperFirst(type)}`, ...properties });
		}
		_attachments.push({
			contentType: 'application/vnd.microsoft.card.adaptive',
			content: {
				$schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
				type: 'AdaptiveCard',
				version: '1.2',
				body,
				actions,
			},
		});
	}
	return _attachments;
}

export function getActionInheritedProperties() {
	return [
		{
			displayName: 'Title',
			name: 'title',
			type: 'string',
			default: '',
			description: 'Label for button or link that represents this action.',
		},
		{
			displayName: 'Icon URL',
			name: 'iconUrl',
			type: 'string',
			default: '',
			description: 'Optional icon to be shown on the action in conjunction with the title. Supports data URI in version 1.2+',
		},
		{
			displayName: 'Style',
			name: 'style',
			type: 'options',
			options: [
				{
					name: 'Default',
					value: 'default',
				},
				{
					name: 'Positive',
					value: 'positive',
				},
				{
					name: 'Destructive',
					value: 'destructive',
				},
			],
			default: '',
			description: 'Controls the style of an Action, which influences how the action is displayed, spoken, etc.',
		},
	];
}