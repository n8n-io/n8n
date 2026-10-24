import type { EndpointCredential, LoginMethod } from './types';
import { normalizeEndpoint } from '../normalizeEndpoint';

export type CustomModelEndpointCredentialData = {
	url?: string;
	authentication?: 'bearer' | 'header' | 'basic' | 'none';
	apiKey?: string;
	authHeaderName?: string;
	authHeaderPrefix?: string;
	username?: string;
	password?: string;
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
		case 'none':
			return { type: 'none' };
		default:
			return { type: 'bearer', token: data.apiKey?.trim() ?? '' };
	}
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
