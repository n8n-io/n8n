import { readFile } from 'node:fs/promises';

import type { JsonObject, JsonValue } from './protocol';
import { isJsonObject } from './protocol';

/** Gives the decrypted data of a credential slot. */
export interface CredentialStore {
	get(slot: string): Promise<JsonObject>;
}

export class CredentialNotFoundError extends Error {
	constructor(slot: string) {
		super(`No credential for slot "${slot}"`);
		this.name = 'CredentialNotFoundError';
	}
}

const ENTRY_KEYS = new Set(['type', 'data', 'inject']);

/**
 * Gives the credential data of one entry of the credentials file. The file has
 * two forms (spec section 7):
 * - `{ "<slot>": { "type": "slackApi", "data": { ... }, "inject": { ... } } }`
 * - the old form `{ "<slot>": { ...data } }`
 *
 * An entry is in the new form when it has a string `type`, an object `data`,
 * and no other keys than `type`, `data` and `inject`.
 */
export function credentialEntryData(entry: JsonValue | undefined): JsonObject | undefined {
	if (!isJsonObject(entry)) return undefined;
	const isNewForm =
		typeof entry.type === 'string' &&
		isJsonObject(entry.data) &&
		Object.keys(entry).every((key) => ENTRY_KEYS.has(key));
	if (isNewForm && isJsonObject(entry.data)) return entry.data;
	return entry;
}

/**
 * Reads credentials from a JSON file in one of the forms of
 * `credentialEntryData`. The store reads the file for each lookup, so the host
 * keeps no state and an edit applies to the next step.
 *
 * PoC only: the plan says the host must fetch credentials from n8n.
 */
export function fileCredentialStore(path: string | undefined): CredentialStore {
	return {
		async get(slot) {
			if (path === undefined || path === '') {
				throw new Error(
					`Step uses credential slot "${slot}", but WF_FALLBACK_CREDENTIALS is not set`,
				);
			}
			const parsed: unknown = JSON.parse(await readFile(path, 'utf8'));
			if (!isJsonObject(parsed)) throw new Error(`Credentials file ${path} is not a JSON object`);
			const data = credentialEntryData(parsed[slot]);
			if (data === undefined) throw new CredentialNotFoundError(slot);
			return data;
		},
	};
}

/**
 * The store of one step: the credentials that the request frame carries come
 * first, the fallback store (the credentials file) after them.
 */
export function frameCredentialStore(
	frame: { credential?: { data: JsonObject }; credentials?: Record<string, { data: JsonObject }> },
	slot: string | undefined,
	fallback: CredentialStore,
): CredentialStore {
	return {
		async get(name) {
			const fromMap = frame.credentials?.[name];
			if (fromMap) return fromMap.data;
			if (frame.credential && (slot === undefined || slot === name)) return frame.credential.data;
			return await fallback.get(name);
		},
	};
}
