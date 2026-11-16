import { isRecord } from '@n8n/utils/is-record';
import { IMPLICIT_MANAGED_VERSION, MANAGED_VERSION_KEY } from 'n8n-workflow';
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

/** True when the entry sets every client field, so it supplies its own app. */
export function hasClientFields(entry: Record<string, unknown>, clientFields: readonly string[]) {
	return clientFields.every((field) => !isEmptyValue(entry[field]));
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

/**
 * True when the token data carries a version value that is not a valid version. A credential
 * in this state cannot be tied to an app, so it must fail and not fall back to version 1.
 */
export function hasInvalidStoredVersion(data: ICredentialDataDecryptedObject): boolean {
	const tokenData = data.oauthTokenData;
	if (!isRecord(tokenData)) return false;

	const version = tokenData[MANAGED_VERSION_KEY];
	return version !== undefined && !isManagedVersion(version);
}

/** The value of the type, or of its nearest parent type that has one. `parentTypes` is nearest first. */
export function nearestValue<T>(
	type: string,
	parentTypes: readonly string[],
	values: Record<string, T>,
): T | undefined {
	for (const name of [type, ...parentTypes]) {
		if (Object.hasOwn(values, name)) return values[name];
	}
	return undefined;
}

/** Returns a copy of the token data with the version added. */
export function withTokenVersion(
	tokenData: ICredentialDataDecryptedObject,
	version: number,
): ICredentialDataDecryptedObject {
	return { ...tokenData, [MANAGED_VERSION_KEY]: version };
}

/**
 * Parses an overwrite payload.
 *
 * A type entry is a plain object. For OAuth types it can state a `version` (default 1).
 * `__versions` holds at most one newer app for each OAuth type, with a greater version.
 *
 * Loading never fails on the content. A part that does not follow these rules is skipped and
 * listed in `problems`, and the rest of the payload loads. This matches how an unknown
 * credential type is handled. A skipped newer app leaves the base entry as the default app.
 *
 * @param clientFieldsOf returns the client fields of an OAuth credential type, `undefined` for other types
 * @param isKnownType returns true when this instance knows the credential type. A type can come from a package that is not installed here.
 * @param parentTypesOf returns the parent types of a credential type, nearest first. A base `version` on a parent applies to a child that sets no client fields.
 *
 * A type whose own entry sets the client fields has its own app. Its version and its newer app
 * come from its own entries only, because a parent can use other client credentials.
 */
export function parseOverwritesPayload(
	payload: unknown,
	clientFieldsOf: (type: string) => readonly string[] | undefined,
	isKnownType: (type: string) => boolean,
	parentTypesOf: (type: string) => readonly string[],
): ParsedCredentialsOverwrites {
	const entries: ICredentialsOverwrite = {};
	const entryVersions: Record<string, number> = {};
	const versions: Record<string, ManagedVersionEntry> = {};
	const problems: string[] = [];

	if (!isRecord(payload)) {
		problems.push(
			'Ignoring the credentials overwrite: it must be an object keyed by credential type.',
		);
		return { entries, entryVersions, versions, problems };
	}

	for (const [type, value] of Object.entries(payload)) {
		if (type === VERSIONS_PAYLOAD_KEY) continue;

		if (!isCredentialData(value)) {
			problems.push(`Ignoring the credentials overwrite for "${type}": it must be an object.`);
			continue;
		}

		if (clientFieldsOf(type) && 'version' in value) {
			const { version, ...fields } = value;
			entries[type] = fields;
			if (isManagedVersion(version)) {
				entryVersions[type] = version;
			} else {
				problems.push(
					`Ignoring the version of the credentials overwrite for "${type}": it must be an integer of at least 1.`,
				);
			}
		} else {
			entries[type] = value;
		}
	}

	const versionsPayload = payload[VERSIONS_PAYLOAD_KEY];
	if (versionsPayload === undefined) return { entries, entryVersions, versions, problems };

	if (!isRecord(versionsPayload)) {
		problems.push(
			`Ignoring "${VERSIONS_PAYLOAD_KEY}": it must be an object keyed by credential type.`,
		);
		return { entries, entryVersions, versions, problems };
	}

	for (const [type, value] of Object.entries(versionsPayload)) {
		const clientFields = clientFieldsOf(type);
		const hasOwnApp =
			clientFields !== undefined &&
			entries[type] !== undefined &&
			hasClientFields(entries[type], clientFields);
		const problem = checkNewerApp(value, {
			clientFields,
			isKnown: isKnownType(type),
			hasBaseEntry: entries[type] !== undefined,
			baseVersion:
				(hasOwnApp
					? entryVersions[type]
					: nearestValue(type, parentTypesOf(type), entryVersions)) ?? IMPLICIT_MANAGED_VERSION,
		});

		if (problem !== undefined) {
			problems.push(`Ignoring "${VERSIONS_PAYLOAD_KEY}" for "${type}": ${problem}`);
		} else if (isManagedVersionEntry(value)) {
			versions[type] = value;
		}
	}

	return { entries, entryVersions, versions, problems };
}

/** Returns the reason why a `__versions` entry cannot be used, or `undefined` when it is valid. */
function checkNewerApp(
	value: unknown,
	context: {
		clientFields: readonly string[] | undefined;
		isKnown: boolean;
		hasBaseEntry: boolean;
		baseVersion: number;
	},
): string | undefined {
	if (!context.isKnown) return 'this instance does not know the credential type.';
	if (!context.clientFields) return 'versions are supported only for OAuth credential types.';
	if (Array.isArray(value)) {
		return `it must be one object. At most two apps can exist at one time: the base entry and one entry in "${VERSIONS_PAYLOAD_KEY}".`;
	}
	if (!isManagedVersionEntry(value)) {
		return 'it must be an object with an integer "version" of at least 1.';
	}
	if (!context.hasBaseEntry) return 'it needs a base entry for the same type.';
	if (value.version <= context.baseVersion) {
		return `the version (${value.version}) must be greater than the version of the base entry (${context.baseVersion}). Never reuse a version.`;
	}

	const missing = context.clientFields.find((field) => isEmptyValue(value[field]));
	if (missing !== undefined) return `it must set "${missing}".`;

	return undefined;
}
