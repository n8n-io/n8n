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

/**
 * A switch, so a login added later stops compiling here rather than leaking quietly. The
 * built header goes in beside the raw value, because a gateway can echo either one, but
 * only when the value is there: with the field blank the header is the bare scheme word,
 * and redacting `Bearer ` takes it out of the gateway's own advice.
 */
function loginSecrets(login: LoginMethod): string[] {
	const sent = () => Object.values(getLoginHeader(login));

	switch (login.type) {
		case 'bearer':
			return login.token ? [login.token, ...sent()] : [];
		case 'header':
			return login.key ? [login.key, ...sent()] : [];
		case 'basic':
			return login.password ? [login.password, ...sent()] : [];
		case 'oauth2':
			return login.clientSecret ? [login.clientSecret, oauth2BasicCredentials(login)] : [];
		case 'none':
			return [];
	}
}

export interface CredentialSecrets {
	/** A credential is never a legitimate word in an answer, so this is filtered everywhere. */
	login: string[];
	/** A user-chosen string can also be a word in an answer, so this is filtered from errors. */
	gatewayHeaders: string[];
}

/**
 * Every value of the credential that must not reach the user in error text, split by how
 * safe it is to redact. A gateway header value is trimmed, because `Headers.set` trims it
 * on the way out and the gateway can only echo what it was sent.
 */
export function credentialSecrets(
	endpoint: Pick<EndpointCredential, 'login' | 'gatewayHeaders'>,
): CredentialSecrets {
	const present = (values: string[]) => values.filter((value) => value.length > 0);

	return {
		login: present(loginSecrets(endpoint.login)),
		gatewayHeaders: present(Object.values(endpoint.gatewayHeaders).map((value) => value.trim())),
	};
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
	// The minted token sits under the login header, which the JSDoc says nothing overrides.
	// OAuth2 is the only login that mints one, and its own header layer is empty.
	[endpoint.gatewayHeaders, requestHeaders, minted, getLoginHeader(endpoint.login)]
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
