import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import { containsExpression, isObject } from '@/utils';

import type { CredentialExportPolicy } from '../../n8n-packages.types';
import type {
	SerializedCredentialData,
	SerializedCredentialDataValue,
} from '../../spec/serialized/credential.schema';

// oauthTokenData never travels, at any depth — tokens are secrets and the target must reconnect.
const NEVER_EXPORTED_KEYS = new Set(['oauthTokenData']);

// Whether every leaf inside the value is an expression, so filtering strips nothing.
function isExpressionOnly(value: unknown): boolean {
	if (typeof value === 'string') return containsExpression(value);
	if (Array.isArray(value)) return value.length > 0 && value.every(isExpressionOnly);
	if (isObject(value)) {
		if (Object.keys(value).some((key) => NEVER_EXPORTED_KEYS.has(key))) return false;
		const values = Object.values(value);
		return values.length > 0 && values.every(isExpressionOnly);
	}
	return false;
}

function filterValue(value: unknown): SerializedCredentialDataValue | undefined {
	if (typeof value === 'string') {
		return containsExpression(value) ? value : undefined;
	}
	if (Array.isArray(value)) {
		// Array positions carry meaning and filtering strips literals, so an entry that is
		// only partly expressions cannot be reproduced at its slot. The array travels only
		// when every entry is expressions end to end; otherwise it is dropped whole.
		if (!isExpressionOnly(value)) return undefined;
		return value
			.map(filterValue)
			.filter((entry): entry is SerializedCredentialDataValue => entry !== undefined);
	}
	if (isObject(value)) {
		const kept = filterObject(value);
		return Object.keys(kept).length > 0 ? kept : undefined;
	}
	return undefined;
}

function filterObject(value: Record<string, unknown>): SerializedCredentialData {
	const kept: SerializedCredentialData = {};
	for (const [key, entry] of Object.entries(value)) {
		if (NEVER_EXPORTED_KEYS.has(key)) continue;
		const filtered = filterValue(entry);
		if (filtered !== undefined) kept[key] = filtered;
	}
	return kept;
}

/* eslint-disable @typescript-eslint/naming-convention -- API credential export policy keys */
const SELECT_EXPORTED_DATA: Record<
	CredentialExportPolicy,
	(
		getDecryptedData: () => Promise<ICredentialDataDecryptedObject>,
	) => Promise<SerializedCredentialData | undefined>
> = {
	'expression-values-only': async (getDecryptedData) => {
		const filtered = filterObject(await getDecryptedData());
		return Object.keys(filtered).length > 0 ? filtered : undefined;
	},
	'no-values': async () => undefined,
};
/* eslint-enable @typescript-eslint/naming-convention */

/** Decides what of a credential's decrypted data travels in the package; `no-values` never decrypts. */
export async function selectCredentialDataForExport(
	policy: CredentialExportPolicy,
	getDecryptedData: () => Promise<ICredentialDataDecryptedObject>,
): Promise<SerializedCredentialData | undefined> {
	return await SELECT_EXPORTED_DATA[policy](getDecryptedData);
}
