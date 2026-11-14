import type { FrontendSettings } from '@n8n/api-types';
import type { LocaleMessages } from '@n8n/i18n';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export async function getSettings(context: IRestApiContext): Promise<FrontendSettings> {
	return await makeRestApiRequest(context, 'GET', '/settings');
}

/** Fetches an admin-configured locale catalog. Missing keys fall back to English in the UI. */
export async function getLocaleCatalog(
	context: IRestApiContext,
	code: string,
): Promise<Partial<LocaleMessages>> {
	return await makeRestApiRequest(context, 'GET', `/locales/${encodeURIComponent(code)}`);
}
