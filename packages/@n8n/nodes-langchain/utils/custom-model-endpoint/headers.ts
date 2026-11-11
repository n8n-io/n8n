import type { IDataObject } from 'n8n-workflow';
import { UserError } from '@n8n/errors';

import type { EndpointCredential, LoginMethod, OAuth2Login } from './types';

/** The application/x-www-form-urlencoded algorithm, which encodeURIComponent is not. */
export function formEncoded(value: string): string {
	return new URLSearchParams({ value }).toString().slice('value='.length);
}

/** RFC 6749 section 2.3.1 form-encodes both halves before base64, unlike RFC 7617 Basic. */
export function oauth2BasicCredentials(login: OAuth2Login): string {
	const pair = `${formEncoded(login.clientId)}:${formEncoded(login.clientSecret)}`;
	return Buffer.from(pair).toString('base64');
}

function getLoginHeader(login: LoginMethod): Record<string, string> {
	switch (login.type) {
		case 'bearer':
			return { Authorization: `Bearer ${login.token}` };
		case 'header':
			return { [login.name]: login.prefix ? `${login.prefix} ${login.key}` : login.key };
		case 'basic':
			return {
				Authorization: `Basic ${Buffer.from(`${login.username}:${login.password}`).toString('base64')}`,
			};
		case 'none':
			return {};
		// The token is fetched per request, so the auth fetch adds this one
		case 'oauth2':
			return {};
	}
}

export function toHeaderRecord(headers: IDataObject | undefined): Record<string, string> {
	return Object.fromEntries(
		Object.entries(headers ?? {})
			.filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value))
			.map(([name, value]) => [name, String(value)]),
	);
}

/** A later layer wins, so nothing overrides the login header. */
export function buildRequestHeaders(options: {
	endpoint: Pick<EndpointCredential, 'login' | 'gatewayHeaders'>;
	requestHeaders?: Record<string, string>;
	/** Minted per request, so OAuth2 is the one login whose header cannot come from the credential. */
	bearerToken?: string;
}): Record<string, string> {
	const { endpoint, requestHeaders = {}, bearerToken } = options;
	const minted = bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {};

	const headers = new Headers();
	[endpoint.gatewayHeaders, requestHeaders, getLoginHeader(endpoint.login), minted]
		.flatMap((layer) => Object.entries(layer))
		.forEach(([name, value]) => {
			try {
				headers.set(name, value);
			} catch {
				// The error of the runtime repeats the value, and the value can be a secret
				throw new UserError(`The header "${name}" is not valid`, {
					description: 'Check the name and the value of the header.',
				});
			}
		});

	return Object.fromEntries(headers);
}
