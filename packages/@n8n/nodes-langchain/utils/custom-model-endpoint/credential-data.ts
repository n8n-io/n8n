import type { EndpointCredential, LoginMethod } from './types';
import { normalizeEndpoint } from '../normalizeEndpoint';

export type CustomModelEndpointCredentialData = {
	url?: string;
	authentication?: 'bearer' | 'header' | 'basic' | 'oauth2' | 'none';
	apiKey?: string;
	authHeaderName?: string;
	authHeaderPrefix?: string;
	username?: string;
	password?: string;
	tokenUrl?: string;
	clientId?: string;
	clientSecret?: string;
	scope?: string;
	sendCredentialsIn?: 'header' | 'body';
	gatewayHeaders?: { headers?: Array<{ name?: string; value?: string }> };
};

function readLoginMethod(data: CustomModelEndpointCredentialData): LoginMethod {
	switch (data.authentication) {
		case 'header':
			return {
				type: 'header',
				name: data.authHeaderName?.trim() ?? '',
				prefix: data.authHeaderPrefix?.trim() ?? '',
				key: data.apiKey?.trim() ?? '',
			};
		case 'basic':
			return {
				type: 'basic',
				username: data.username?.trim() ?? '',
				// A password may start or end with a space on purpose
				password: data.password ?? '',
			};
		case 'oauth2':
			return {
				type: 'oauth2',
				tokenUrl: data.tokenUrl?.trim() ?? '',
				clientId: data.clientId?.trim() ?? '',
				clientSecret: data.clientSecret ?? '',
				scope: data.scope?.trim() ?? '',
				sendCredentialsIn: data.sendCredentialsIn ?? 'header',
			};
		case 'none':
			return { type: 'none' };
		default:
			return { type: 'bearer', token: data.apiKey?.trim() ?? '' };
	}
}

export type OpenAiCredentialData = {
	apiKey?: string;
	organizationId?: string;
	url?: string;
	header?: boolean;
	headerName?: string;
	headerValue?: string;
};

/** So a workflow already reaching a gateway through the OpenAI node keeps its credential. */
export function readOpenAiCredential(data: OpenAiCredentialData): EndpointCredential {
	const custom =
		data.header && data.headerName?.trim()
			? { [data.headerName.trim()]: data.headerValue ?? '' }
			: {};
	const organization = data.organizationId?.trim()
		? { 'OpenAI-Organization': data.organizationId.trim() }
		: {};

	return {
		baseUrl: normalizeEndpoint(data.url) ?? '',
		login: { type: 'bearer', token: data.apiKey?.trim() ?? '' },
		gatewayHeaders: { ...organization, ...custom },
	};
}

export function readCustomModelEndpointCredential(
	data: CustomModelEndpointCredentialData,
): EndpointCredential {
	const gatewayHeaders = (data.gatewayHeaders?.headers ?? []).flatMap<[string, string]>(
		({ name, value }) => {
			const headerName = name?.trim();
			return headerName ? [[headerName, value ?? '']] : [];
		},
	);

	return {
		baseUrl: normalizeEndpoint(data.url) ?? '',
		login: readLoginMethod(data),
		gatewayHeaders: Object.fromEntries(gatewayHeaders),
	};
}
