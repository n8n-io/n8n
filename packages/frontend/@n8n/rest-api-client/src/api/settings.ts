import type { FrontendSettings } from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export async function getSettings(context: IRestApiContext): Promise<FrontendSettings> {
	return await makeRestApiRequest(context, 'GET', '/settings');
}

export async function getEditorLanguage(
	context: IRestApiContext,
	code: string,
): Promise<Record<string, string>> {
	return await makeRestApiRequest(context, 'GET', `/editor-language/${code}`);
}
