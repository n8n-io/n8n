import {
	LINKED_INSTANCE_MAX_URL_LENGTH,
	linkedInstanceNameSchema,
	linkedInstanceTokenSchema,
} from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';

/*
 * The address rules mirror `normaliseInstanceAddress` in
 * packages/cli/src/modules/linked-instances/instance-address.ts (L01). Keep the two in step:
 * the form must accept every address that the server accepts, and reject the rest with the same reason.
 */

export type InstanceAddressError =
	| 'empty'
	| 'invalid'
	| 'unsupported-protocol'
	| 'insecure-http'
	| 'has-credentials';

export type InstanceAddressCheck =
	| { ok: true; origin: string; isLoopback: boolean }
	| { ok: false; error: InstanceAddressError };

export type LinkFormValues = { name: string; url: string; token: string };

export type LinkFormField = keyof LinkFormValues;

export type LinkFormErrors = Partial<Record<LinkFormField, BaseTextKey>>;

const SCHEME_PREFIX = /^[a-z][a-z0-9+.-]*:/i;
// The URL parser reads "localhost:5678" as scheme "localhost". Users mean host and port.
const HOST_AND_PORT = /^[^/?#@:]+:\d+(?:[/?#]|$)/;
// The URL parser reads "user:pw@host" as scheme "user". Users mean credentials and a host.
const USER_INFO_WITHOUT_SCHEME = /^[^/?#]+@/;
// The URL parser silently removes tabs and newlines. Reject them so a typo does not pass.
const WHITESPACE = /\s/;
// The URL parser writes every IPv4 form ("127.1", "0x7f.0.0.1") as four decimal parts.
const IPV4_LOOPBACK = /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const SUPPORTED_PROTOCOLS = new Set(['http:', 'https:']);

const ADDRESS_ERROR_KEYS: Record<InstanceAddressError, BaseTextKey> = {
	empty: 'settings.linkedInstances.form.url.empty',
	invalid: 'settings.linkedInstances.form.url.invalid',
	'unsupported-protocol': 'settings.linkedInstances.form.url.unsupportedProtocol',
	'insecure-http': 'settings.linkedInstances.form.url.insecureHttp',
	'has-credentials': 'settings.linkedInstances.form.url.hasCredentials',
};

/** True for "localhost", 127.0.0.0/8 and "[::1]", as `URL.hostname` writes them. */
export function isLoopbackHostname(hostname: string): boolean {
	return hostname === 'localhost' || hostname === '[::1]' || IPV4_LOOPBACK.test(hostname);
}

function withScheme(address: string): string {
	const hasScheme =
		SCHEME_PREFIX.test(address) &&
		!HOST_AND_PORT.test(address) &&
		!USER_INFO_WITHOUT_SCHEME.test(address);
	return hasScheme ? address : `https://${address}`;
}

function parseUrl(address: string): URL | undefined {
	try {
		return new URL(address);
	} catch {
		return undefined;
	}
}

function findUrlError(url: URL): InstanceAddressError | undefined {
	if (!SUPPORTED_PROTOCOLS.has(url.protocol)) return 'unsupported-protocol';
	if (url.username !== '' || url.password !== '') return 'has-credentials';
	if (url.protocol === 'http:' && !isLoopbackHostname(url.hostname)) return 'insecure-http';
	return undefined;
}

/**
 * Reads an instance address as the server does. A bare host gets `https://`.
 * Plain `http://` is accepted only for an instance on this computer. Never throws.
 */
export function checkInstanceAddress(input: string): InstanceAddressCheck {
	// The server checks the length of the raw input first.
	if (input.length > LINKED_INSTANCE_MAX_URL_LENGTH) return { ok: false, error: 'invalid' };

	const address = input.trim();
	if (address === '') return { ok: false, error: 'empty' };
	if (WHITESPACE.test(address)) return { ok: false, error: 'invalid' };

	const url = parseUrl(withScheme(address));
	if (!url) return { ok: false, error: 'invalid' };

	const error = findUrlError(url);
	if (error) return { ok: false, error };

	// For http and https, `URL.origin` has a lower-case host and no default port, path, query or hash.
	return { ok: true, origin: url.origin, isLoopback: isLoopbackHostname(url.hostname) };
}

function lengthOver(value: string, max: number | null): boolean {
	return max !== null && value.length > max;
}

/** The i18n key of the problem with the name, or `undefined` when the server accepts it. */
export function linkNameError(name: string): BaseTextKey | undefined {
	if (linkedInstanceNameSchema.safeParse(name).success) return undefined;
	const trimmed = name.trim();
	if (trimmed === '') return 'settings.linkedInstances.form.name.required';
	if (lengthOver(trimmed, linkedInstanceNameSchema.maxLength)) {
		return 'settings.linkedInstances.form.name.tooLong';
	}
	return 'settings.linkedInstances.form.name.invalid';
}

/** The i18n key of the problem with the address, or `undefined` when the server accepts it. */
export function linkUrlError(url: string): BaseTextKey | undefined {
	const result = checkInstanceAddress(url);
	return result.ok ? undefined : ADDRESS_ERROR_KEYS[result.error];
}

/** The i18n key of the problem with the token, or `undefined` when the server accepts it. */
export function accessTokenError(token: string): BaseTextKey | undefined {
	if (linkedInstanceTokenSchema.safeParse(token).success) return undefined;
	const trimmed = token.trim();
	if (trimmed === '') return 'settings.linkedInstances.form.token.required';
	if (lengthOver(trimmed, linkedInstanceTokenSchema.maxLength)) {
		return 'settings.linkedInstances.form.token.tooLong';
	}
	return 'settings.linkedInstances.form.token.invalid';
}

/** Checks every field of the link form. An empty result means the form can go to the server. */
export function validateLinkForm(values: LinkFormValues): LinkFormErrors {
	const errors: LinkFormErrors = {};
	const name = linkNameError(values.name);
	const url = linkUrlError(values.url);
	const token = accessTokenError(values.token);
	if (name) errors.name = name;
	if (url) errors.url = url;
	if (token) errors.token = token;
	return errors;
}
