import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IHttpRequestMethods,
	IRequestOptions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

type CalendlyIdentityResponse = {
	resource?: {
		uri?: string;
		current_organization?: string;
	};
};

export function hasResponseStatus(error: any, status: number): boolean {
	if (error && (error.httpCode === status.toString() || error.httpCode === status)) {
		return true;
	}
	return (
		typeof error === 'object' &&
		error !== null &&
		'response' in error &&
		typeof error.response === 'object' &&
		error.response !== null &&
		'status' in error.response &&
		error.response.status === status
	);
}

function isCalendlyIdentityResponse(value: unknown): value is CalendlyIdentityResponse {
	return (
		typeof value === 'object' &&
		value !== null &&
		'resource' in value &&
		(typeof value.resource === 'object' || value.resource === undefined || value.resource === null)
	);
}

function getCredentialType(authentication: string): 'calendlyApi' | 'calendlyOAuth2Api' {
	return authentication === 'apiKey' ? 'calendlyApi' : 'calendlyOAuth2Api';
}

export async function resolveIdentity(
	this: IHookFunctions,
): Promise<{ userUri: string; organizationUri: string }> {
	const staticData = this.getWorkflowStaticData('node');
	const cachedAt =
		typeof staticData.identityCachedAt === 'string' ? staticData.identityCachedAt : '';
	const cachedUserUri = typeof staticData.userUri === 'string' ? staticData.userUri : '';
	const cachedOrganizationUri =
		typeof staticData.organizationUri === 'string' ? staticData.organizationUri : '';

	if (cachedAt && cachedUserUri && cachedOrganizationUri) {
		const cacheAge = Date.now() - new Date(cachedAt).getTime();
		if (cacheAge >= 0 && cacheAge < 24 * 60 * 60 * 1000) {
			return {
				userUri: cachedUserUri,
				organizationUri: cachedOrganizationUri,
			};
		}
	}

	let response: unknown;

	try {
		response = await calendlyApiRequest.call(this, 'GET', '/users/me');
	} catch (error) {
		if (hasResponseStatus(error, 403)) {
			// Pass {} (not the error itself) because NodeApiError short-circuits when
			// errorResponse is already a NodeApiError instance, ignoring the custom message.
			throw new NodeApiError(this.getNode(), {} as JsonObject, {
				message: 'Calendly credentials need the "user:read" scope to register webhooks.',
				httpCode: '403',
			});
		}
		throw error;
	}

	if (!isCalendlyIdentityResponse(response)) {
		throw new NodeApiError(this.getNode(), {} as JsonObject, {
			message: 'Malformed Calendly identity response.',
		});
	}

	const resource = response.resource;
	if (!resource?.uri || !resource.current_organization) {
		throw new NodeApiError(this.getNode(), {} as JsonObject, {
			message: 'Malformed Calendly identity response.',
		});
	}

	staticData.userUri = resource.uri;
	staticData.organizationUri = resource.current_organization;
	staticData.identityCachedAt = new Date().toISOString();

	return {
		userUri: resource.uri,
		organizationUri: resource.current_organization,
	};
}

export async function calendlyApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions | IWebhookFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<unknown> {
	let options: IRequestOptions = {
		headers: {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri ?? `https://api.calendly.com${resource}`,
		json: true,
	};

	options = {
		...options,
		...option,
	};

	const authentication = this.getNodeParameter('authentication', 0) as string;
	const credentialType = getCredentialType(authentication);

	try {
		return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
	} catch (error) {
		if (hasResponseStatus(error, 429)) {
			throw new NodeApiError(this.getNode(), error as JsonObject, {
				message: 'Calendly API rate limit reached. Please try again later.',
			});
		}
		// Preserve the original error structure for 403 so callers can inspect httpCode/response
		if (hasResponseStatus(error, 403)) {
			throw new NodeApiError(this.getNode(), error as JsonObject, {
				httpCode: '403',
			});
		}
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
