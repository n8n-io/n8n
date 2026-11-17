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
 * Fetches a locale catalog from a static file server: the n8n server for a local catalog, or a
 * translation server for a remote one. Sends no credentials, because a static file needs none.
 * Missing keys fall back to English in the UI.
 *
 * @param url An absolute URL, or a path relative to `baseUrl`.
 * @param baseUrl The n8n base URL, absolute or relative to the current page.
 */
export async function fetchLocaleCatalog(
	url: string,
	baseUrl: string,
): Promise<Partial<LocaleMessages>> {
	const resolvedUrl = new URL(url, new URL(baseUrl, window.location.href)).href;

	let response: Response;
	try {
		response = await fetch(resolvedUrl, { credentials: 'omit' });
	} catch (error) {
		// A network or CORS error only says "Failed to fetch", so name the URL.
		throw new Error(`Failed to load the locale catalog from ${resolvedUrl}`, { cause: error });
	}
	if (!response.ok) {
		throw new Error(
			`Failed to load the locale catalog from ${resolvedUrl}: HTTP ${response.status}`,
		);
	}

	const parsed: unknown = await response.json();
	if (!isRecord(parsed)) {
		throw new Error(`The locale catalog at ${resolvedUrl} is not a JSON object`);
	}

	return Object.fromEntries(
		Object.entries(parsed).filter(([key]) => !key.startsWith(BACKEND_KEY_PREFIX)),
	);
}
