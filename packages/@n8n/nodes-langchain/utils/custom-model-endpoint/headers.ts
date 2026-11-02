import type { IDataObject } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

import type { EndpointCredential, LoginMethod } from './types';

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
}): Record<string, string> {
	const { endpoint, requestHeaders = {} } = options;

	const headers = new Headers();
	[endpoint.gatewayHeaders, requestHeaders, getLoginHeader(endpoint.login)]
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
