import { isRecord } from '@n8n/utils/is-record';
import { IMPLICIT_MANAGED_VERSION, MANAGED_VERSION_KEY, UserError } from 'n8n-workflow';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import type {
	ICredentialsOverwrite,
	ManagedVersionEntry,
	ParsedCredentialsOverwrites,
} from '@/interfaces';

/** Top-level key of the overwrite payload that holds the newer app of a rollout. */
export const VERSIONS_PAYLOAD_KEY = '__versions';

export function isManagedVersion(value: unknown): value is number {
	return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

export function isManagedVersionEntry(value: unknown): value is ManagedVersionEntry {
	return isRecord(value) && isManagedVersion(value.version);
}

function isCredentialData(value: unknown): value is ICredentialDataDecryptedObject {
	return isRecord(value);
}

function isEmptyValue(value: unknown) {
	return value === undefined || value === null || value === '';
}

/** True when the credential client fields are all empty, so the overwrite supplies them. */
export function hasEmptyClientFields(
	data: ICredentialDataDecryptedObject,
	clientFields: readonly string[],
) {
	return clientFields.every((field) => isEmptyValue(data[field]));
}

/** True when the credential holds OAuth token data of any kind (an object, or an encrypted string). */
export function hasTokenData(data: ICredentialDataDecryptedObject) {
	const tokenData = data.oauthTokenData;
	if (typeof tokenData === 'string') return tokenData !== '';
	return isRecord(tokenData) && Object.keys(tokenData).length > 0;
}

/** Returns the entry fields without the `version` key. */
export function withoutVersion(entry: ManagedVersionEntry): ICredentialDataDecryptedObject {
	const { version: _version, ...fields } = entry;
	return fields;
}

/** Reads the version stored on a credential. Returns `undefined` when there is none. */
export function readStoredVersion(data: ICredentialDataDecryptedObject): number | undefined {
	const tokenData = data.oauthTokenData;
	if (!isRecord(tokenData)) return undefined;

	const version = tokenData[MANAGED_VERSION_KEY];
	return isManagedVersion(version) ? version : undefined;
}

/** Returns a copy of the token data with the version added. */
export function withTokenVersion(
	tokenData: ICredentialDataDecryptedObject,
	version: number,
): ICredentialDataDecryptedObject {
	return { ...tokenData, [MANAGED_VERSION_KEY]: version };
}

/** Returns a copy of the credential data with the version stored next to the tokens. */
export function withStoredVersion(
	data: ICredentialDataDecryptedObject,
	version: number,
): ICredentialDataDecryptedObject {
	const tokenData = isCredentialData(data.oauthTokenData) ? data.oauthTokenData : {};
	return { ...data, oauthTokenData: withTokenVersion(tokenData, version) };
}

/**
 * Parses and validates an overwrite payload.
 *
 * A type entry is a plain object. For OAuth types it can state a `version` (default 1).
 * `__versions` holds at most one newer app for each OAuth type, with a greater version.
 * Throws a `UserError` for any invalid payload, so the caller keeps its previous config.
 *
 * @param clientFieldsOf returns the client fields of an OAuth credential type, `undefined` for other types
 */
export function parseOverwritesPayload(
	payload: Record<string, unknown>,
	clientFieldsOf: (type: string) => readonly string[] | undefined,
): ParsedCredentialsOverwrites {
	const entries: ICredentialsOverwrite = {};
	const entryVersions: Record<string, number> = {};
	const versions: Record<string, ManagedVersionEntry> = {};

	for (const [type, value] of Object.entries(payload)) {
		if (type === VERSIONS_PAYLOAD_KEY) continue;

		if (!isCredentialData(value)) {
			throw new UserError(`The credentials overwrite for "${type}" must be an object.`);
		}

		if (clientFieldsOf(type) && 'version' in value) {
			const { version, ...fields } = value;
			if (!isManagedVersion(version)) {
				throw new UserError(
					`The version of the credentials overwrite for "${type}" must be an integer of at least 1.`,
				);
			}
			entryVersions[type] = version;
			entries[type] = fields;
		} else {
			entries[type] = value;
		}
	}

	const versionsPayload = payload[VERSIONS_PAYLOAD_KEY];
	if (versionsPayload === undefined) return { entries, entryVersions, versions };

	if (!isRecord(versionsPayload)) {
		throw new UserError(`"${VERSIONS_PAYLOAD_KEY}" must be an object keyed by credential type.`);
	}

	for (const [type, value] of Object.entries(versionsPayload)) {
		const clientFields = clientFieldsOf(type);
		if (!clientFields) {
			throw new UserError(
				`Versions are supported only for OAuth credential types, and "${type}" is not one.`,
			);
		}

		if (Array.isArray(value)) {
			throw new UserError(
				`"${VERSIONS_PAYLOAD_KEY}" for "${type}" must be one object. At most two apps can exist at one time: the base entry and one entry in "${VERSIONS_PAYLOAD_KEY}".`,
			);
		}

		if (!isManagedVersionEntry(value)) {
			throw new UserError(
				`The "${VERSIONS_PAYLOAD_KEY}" entry for "${type}" must be an object with an integer "version" of at least 1.`,
			);
		}

		if (!entries[type]) {
			throw new UserError(
				`"${VERSIONS_PAYLOAD_KEY}" for "${type}" needs a base entry for the same type.`,
			);
		}

		const baseVersion = entryVersions[type] ?? IMPLICIT_MANAGED_VERSION;
		if (value.version <= baseVersion) {
			throw new UserError(
				`The version in "${VERSIONS_PAYLOAD_KEY}" for "${type}" (${value.version}) must be greater than the version of the base entry (${baseVersion}). Never reuse a version.`,
			);
		}

		for (const field of clientFields) {
			if (isEmptyValue(value[field])) {
				throw new UserError(
					`The "${VERSIONS_PAYLOAD_KEY}" entry for "${type}" must set "${field}".`,
				);
			}
		}

		versions[type] = value;
	}

	return { entries, entryVersions, versions };
}
