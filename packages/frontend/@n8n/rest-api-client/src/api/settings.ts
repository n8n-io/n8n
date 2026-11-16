import type { FrontendSettings } from '@n8n/api-types';
import type { LocaleMessages } from '@n8n/i18n';
import { isRecord } from '@n8n/utils/is-record';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

/** Keys under this prefix are reserved for backend message translations. */
const BACKEND_KEY_PREFIX = 'backend.';

export type AvailableLocale = FrontendSettings['availableLocales'][number];

export async function getSettings(context: IRestApiContext): Promise<FrontendSettings> {
	return await makeRestApiRequest(context, 'GET', '/settings');
}

/**
 * Fetches a locale catalog from the n8n server. Send the `hash` from the settings, so the
 * browser can cache the catalog until its content changes.
 */
export async function getLocaleCatalog(
	context: IRestApiContext,
	code: string,
	hash?: string,
): Promise<Partial<LocaleMessages>> {
	return await makeRestApiRequest(
		context,
		'GET',
		`/locales/${encodeURIComponent(code)}`,
		hash ? { v: hash } : undefined,
	);
}

/**
 * Fetches a locale catalog directly from the translation server, not through n8n. Sends no
 * credentials, because the server is not part of n8n.
 */
export async function getRemoteLocaleCatalog(url: string): Promise<Partial<LocaleMessages>> {
	const response = await fetch(url, { credentials: 'omit' });
	if (!response.ok) {
		throw new Error(`Failed to load the locale catalog from ${url}: HTTP ${response.status}`);
	}

	const parsed: unknown = await response.json();
	if (!isRecord(parsed)) {
		throw new Error(`The locale catalog at ${url} is not a JSON object`);
	}

	return Object.fromEntries(
		Object.entries(parsed).filter(([key]) => !key.startsWith(BACKEND_KEY_PREFIX)),
	);
}

/**
 * Loads the catalog of a configured locale from where it lives: the translation server for a
 * remote catalog, and the n8n server for a local file. Missing keys fall back to English in the UI.
 */
export async function loadLocaleCatalog(
	context: IRestApiContext,
	locale: AvailableLocale,
): Promise<Partial<LocaleMessages>> {
	if (locale.url) return await getRemoteLocaleCatalog(locale.url);
	return await getLocaleCatalog(context, locale.code, locale.hash);
}
