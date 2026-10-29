import { isRecord } from '@n8n/utils/is-record';
import { containsExpression } from '@n8n/utils/string/contains-expression';
import type { ICredentialDataDecryptedObject, IDataObject } from 'n8n-workflow';

/**
 * How to merge an incoming array into the existing value.
 * - `merge-by-index`: merge item by item when the lengths match, otherwise use the incoming array.
 * - `keep-existing`: keep the existing value. Use this when the incoming array is lossy.
 */
export type CredentialArrayMergeMode = 'merge-by-index' | 'keep-existing';

function mergeValue(
	incoming: unknown,
	existing: unknown,
	arrays: CredentialArrayMergeMode,
): unknown {
	if (typeof incoming === 'string') {
		if (containsExpression(incoming)) {
			return incoming;
		} else if (existing !== undefined && existing !== null) {
			// Existing value is preserved if it exists (secret handling)
			return existing;
		}

		// The incoming field exists as an empty string (key is part of the schema)
		// but existing has no value for it. Preserve the empty string so the field
		// is not silently dropped from the merged credential.
		return '';
	}

	if (typeof incoming === 'number' || typeof incoming === 'boolean') {
		return incoming;
	}

	if (Array.isArray(incoming)) {
		if (arrays === 'keep-existing') return existing;

		// Only merge by index if lengths match, otherwise array structure has changed
		// and we can't reliably match items (could be additions/removals/reordering)
		if (Array.isArray(existing) && existing.length === incoming.length) {
			return incoming.map((item: unknown, index) => mergeValue(item, existing[index], arrays));
		}

		return incoming;
	}

	if (isRecord(incoming)) {
		// Merge into an empty object when there is nothing to merge into, so the
		// array mode also applies to arrays nested in a new object.
		const merged = mergeObjects(incoming, isRecord(existing) ? existing : {}, arrays);

		// Only kept arrays were in the new object. Do not add an empty object for them,
		// so that a merge which changes nothing gives the existing data back.
		if (arrays === 'keep-existing' && !isRecord(existing) && Object.keys(merged).length === 0) {
			return existing;
		}

		return merged;
	}

	// `null` or another value that carries no data: keep what exists.
	return existing;
}

function mergeObjects(
	incoming: Record<string, unknown>,
	existing: Record<string, unknown>,
	arrays: CredentialArrayMergeMode,
): Record<string, unknown> {
	const merged: Record<string, unknown> = {};

	for (const [key, incomingValue] of Object.entries(incoming)) {
		// Own keys only, so a name such as `toString` does not resolve to an inherited value.
		const existingValue = Object.hasOwn(existing, key) ? existing[key] : undefined;
		const mergedValue = mergeValue(incomingValue, existingValue, arrays);

		if (mergedValue !== undefined) {
			merged[key] = mergedValue;
		}
	}

	// Keep existing fields the incoming data does not carry. A field left at its default
	// value is not persisted, so it never reaches the incoming data; an absent field carries
	// the same "no value to give" meaning as a present-but-blank one, which is already
	// preserved above. Without this it would be dropped and reset to its default. This also
	// covers oauthTokenData, which incoming data never carries.
	for (const [key, existingValue] of Object.entries(existing)) {
		if (!Object.hasOwn(incoming, key)) {
			merged[key] = existingValue;
		}
	}

	return merged;
}

/**
 * Merges incoming credential data into existing data. Incoming expressions,
 * numbers and booleans overwrite existing values. Incoming plain strings do not
 * carry secrets, so the existing value stays. Does not mutate the inputs.
 */
export function mergeCredentialData({
	existing,
	incoming,
	arrays,
}: {
	existing: ICredentialDataDecryptedObject;
	incoming: IDataObject;
	arrays: CredentialArrayMergeMode;
}): ICredentialDataDecryptedObject {
	// Every leaf comes from `existing`, `incoming` or is `''`, so the shape stays credential data.
	return mergeObjects(incoming, existing, arrays) as ICredentialDataDecryptedObject;
}
