import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import type {
	CreateFacebookAppWebhookSubscription,
	FacebookAppWebhookSubscription,
	FacebookAppWebhookSubscriptionsResponse,
	FacebookFormListResponse,
	FacebookPage,
	FacebookPageListResponse,
} from './types';

export async function facebookApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body = {},
	qs: IDataObject = {},
): Promise<any> {
	const options: IRequestOptions = {
		headers: {
			accept: 'application/json',
		},
		method,
		qs,
		body,
		gzip: true,
		uri: `https://graph.facebook.com/v21.0${resource}`,
		json: true,
	};

	try {
		return await this.helpers.requestOAuth2.call(this, 'facebookLeadAdsOAuth2Api', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: error?.error?.error?.message,
		});
	}
}

export async function appAccessTokenRead(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
): Promise<{ access_token: string }> {
	const credentials = await this.getCredentials('facebookLeadAdsOAuth2Api');

	const options: IRequestOptions = {
		headers: {
			'content-type': 'application/x-www-form-urlencoded',
		},
		method: 'POST',
		form: {
			client_id: credentials.clientId,
			client_secret: credentials.clientSecret,
			grant_type: 'client_credentials',
		},
		uri: credentials.accessTokenUrl as string,
		json: true,
	};
	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function facebookAppApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body?: { type: 'json'; payload: IDataObject } | { type: 'form'; payload: IDataObject },
	qs: IDataObject = {},
): Promise<any> {
	const tokenResponse = await appAccessTokenRead.call(this);
	const appAccessToken = tokenResponse.access_token;

	const options: IRequestOptions = {
		headers: {
			accept: 'application/json',
			authorization: `Bearer ${appAccessToken}`,
		},
		method,
		qs,
		gzip: true,
		uri: `https://graph.facebook.com/v21.0${resource}`,
		json: true,
	};

	if (body?.type === 'json') {
		options.body = body.payload;
	} else if (body?.type === 'form') {
		options.form = body.payload;
	}

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function appWebhookSubscriptionList(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	appId: string,
): Promise<FacebookAppWebhookSubscription[]> {
	const response = (await facebookAppApiRequest.call(
		this,
		'GET',
		`/${appId}/subscriptions`,
	)) as FacebookAppWebhookSubscriptionsResponse;
	return response.data;
}

export async function appWebhookSubscriptionCreate(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	appId: string,
	subscription: CreateFacebookAppWebhookSubscription,
) {
	return await facebookAppApiRequest.call(this, 'POST', `/${appId}/subscriptions`, {
		type: 'form',
		payload: { ...subscription },
	});
}

export async function appWebhookSubscriptionDelete(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	appId: string,
	object: string,
) {
	return await facebookAppApiRequest.call(this, 'DELETE', `/${appId}/subscriptions`, {
		type: 'form',
		payload: { object },
	});
}

export async function facebookPageList(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	cursor?: string,
): Promise<FacebookPageListResponse> {
	const response = (await facebookApiRequest.call(
		this,
		'GET',
		'/me/accounts',
		{},
		{ cursor, fields: 'id,name' },
	)) as FacebookPageListResponse;
	return response;
}

export async function facebookEntityDetail(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	entityId: string,
	fields = 'id,name,access_token',
): Promise<any> {
	return await facebookApiRequest.call(this, 'GET', `/${entityId}`, {}, { fields });
}

export async function facebookPageApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body = {},
	qs: IDataObject = {},
): Promise<any> {
	const pageId = this.getNodeParameter('page', '', { extractValue: true }) as string;
	const page = (await facebookEntityDetail.call(this, pageId)) as FacebookPage;
	const pageAccessToken = page.access_token;
	const options: IRequestOptions = {
		headers: {
			accept: 'application/json',
			authorization: `Bearer ${pageAccessToken}`,
		},
		method,
		qs,
		body,
		gzip: true,
		uri: `https://graph.facebook.com/v21.0${resource}`,
		json: true,
	};

	try {
		return await this.helpers.request.call(this, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function installAppOnPage(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	pageId: string,
	fields: string,
) {
	return await facebookPageApiRequest.call(
		this,
		'POST',
		`/${pageId}/subscribed_apps`,
		{},
		{ subscribed_fields: fields },
	);
}

export async function facebookFormList(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	pageId: string,
	cursor?: string,
): Promise<FacebookFormListResponse> {
	const response = (await facebookPageApiRequest.call(
		this,
		'GET',
		`/${pageId}/leadgen_forms`,
		{},
		{ cursor, fields: 'id,name' },
	)) as FacebookFormListResponse;
	return response;
}
