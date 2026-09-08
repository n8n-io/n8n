import type { IRestApiContext } from '@n8n/rest-api-client';

import * as mockServer from './context.mock-server';
import type {
	CreatePreferencePayload,
	Preference,
	PreferenceListQuery,
	PreferenceListResponse,
	UpdatePreferencePayload,
} from './context.types';

/**
 * Preferences API client.
 *
 * The endpoints do not exist yet, so every call is served from an in-memory stand-in.
 * This file is the single swap point: replace each body with the `makeRestApiRequest`
 * call named in its comment, then delete `context.mock-server.ts`.
 */

/** GET /rest/context/preferences */
export async function getPreferences(
	_context: IRestApiContext,
	query: PreferenceListQuery = {},
): Promise<PreferenceListResponse> {
	return await Promise.resolve(mockServer.list(query));
}

/** POST /rest/context/preferences */
export async function createPreference(
	_context: IRestApiContext,
	payload: CreatePreferencePayload,
): Promise<Preference> {
	return await Promise.resolve(mockServer.create(payload));
}

/** PATCH /rest/context/preferences/:id */
export async function updatePreference(
	_context: IRestApiContext,
	id: string,
	payload: UpdatePreferencePayload,
): Promise<Preference> {
	return await Promise.resolve(mockServer.update(id, payload));
}

/** DELETE /rest/context/preferences/:id */
export async function deletePreference(_context: IRestApiContext, id: string): Promise<void> {
	return await Promise.resolve(mockServer.remove(id));
}
