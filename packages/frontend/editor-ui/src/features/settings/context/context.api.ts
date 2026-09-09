import type { IRestApiContext } from '@n8n/rest-api-client';

import * as mockServer from './context.mock-server';
import type {
	Preference,
	PreferenceListQuery,
	PreferenceListResponse,
	PreferencePayload,
} from './context.types';

/**
 * Preferences API client.
 *
 * The endpoints do not exist yet — the backend so far provides the `ai_preference`
 * table and the read path that renders preferences into AI prompts, not CRUD. Every
 * call here is served from an in-memory stand-in. This file is the single swap point:
 * replace each body with the `makeRestApiRequest` call named in its comment, then
 * delete `context.mock-server.ts`.
 */

/** GET /rest/ai-preferences */
export async function getPreferences(
	_context: IRestApiContext,
	query: PreferenceListQuery = {},
): Promise<PreferenceListResponse> {
	return await Promise.resolve(mockServer.list(query));
}

/** POST /rest/ai-preferences */
export async function createPreference(
	_context: IRestApiContext,
	payload: PreferencePayload,
): Promise<Preference> {
	return await Promise.resolve(mockServer.create(payload));
}

/** PATCH /rest/ai-preferences/:id */
export async function updatePreference(
	_context: IRestApiContext,
	id: string,
	payload: PreferencePayload,
): Promise<Preference> {
	return await Promise.resolve(mockServer.update(id, payload));
}

/** DELETE /rest/ai-preferences/:id */
export async function deletePreference(_context: IRestApiContext, id: string): Promise<void> {
	return await Promise.resolve(mockServer.remove(id));
}
