import type { CredentialResolverConfiguration } from '@n8n/decorators';
import { CREDENTIAL_BLANKING_VALUE, isINodePropertyCollection } from 'n8n-workflow';
import type { INodeProperties } from 'n8n-workflow';

const isRecord = (value: unknown): value is Record<string, unknown> =>
	value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Collect the names of every config field a resolver type marks as secret
 * (`typeOptions.password`), descending into `collection`/`fixedCollection` subtrees so a
 * secret nested inside a container is not missed. Names are matched by key at any depth.
 */
export const collectSecretFieldNames = (options: INodeProperties[] | undefined): Set<string> => {
	const names = new Set<string>();
	for (const prop of options ?? []) {
		if (prop.typeOptions?.password === true) {
			names.add(prop.name);
		}
		for (const option of prop.options ?? []) {
			if (isINodePropertyCollection(option)) {
				// fixedCollection: the nested properties live under `values`
				for (const name of collectSecretFieldNames(option.values)) names.add(name);
			} else if ('type' in option) {
				// collection: the entry is itself a property
				for (const name of collectSecretFieldNames([option])) names.add(name);
			}
		}
	}
	return names;
};

const redactValue = (value: unknown, secretNames: Set<string>): unknown => {
	if (Array.isArray(value)) {
		return value.map((item) => redactValue(item, secretNames));
	}
	if (isRecord(value)) {
		const result: Record<string, unknown> = {};
		for (const [key, val] of Object.entries(value)) {
			result[key] = secretNames.has(key)
				? CREDENTIAL_BLANKING_VALUE
				: redactValue(val, secretNames);
		}
		return result;
	}
	return value;
};

/** Return a copy of the config with every secret field (at any depth) replaced by the blanking sentinel. */
export const redactSecretConfig = (
	config: CredentialResolverConfiguration | undefined,
	secretNames: Set<string>,
): CredentialResolverConfiguration => {
	const result: CredentialResolverConfiguration = {};
	for (const [key, val] of Object.entries(config ?? {})) {
		result[key] = secretNames.has(key) ? CREDENTIAL_BLANKING_VALUE : redactValue(val, secretNames);
	}
	return result;
};

const restoreValue = (incoming: unknown, stored: unknown, secretNames: Set<string>): unknown => {
	if (Array.isArray(incoming)) {
		return incoming.map((item, index) =>
			restoreValue(item, Array.isArray(stored) ? stored[index] : undefined, secretNames),
		);
	}
	if (isRecord(incoming)) {
		const storedObj = isRecord(stored) ? stored : undefined;
		const result: Record<string, unknown> = {};
		for (const [key, val] of Object.entries(incoming)) {
			if (secretNames.has(key) && val === CREDENTIAL_BLANKING_VALUE) {
				// Restore the stored secret only when we have one; a changed resolver type
				// gets fresh fields, so no matching stored value exists there.
				result[key] = storedObj && key in storedObj ? storedObj[key] : val;
			} else {
				result[key] = restoreValue(val, storedObj?.[key], secretNames);
			}
		}
		return result;
	}
	return incoming;
};

/**
 * Return a copy of the incoming config where any secret field (at any depth) still holding
 * the blanking sentinel is replaced with the stored value, so a redacted round-trip save
 * does not overwrite the real secret.
 */
export const restoreSecretConfig = (
	incoming: CredentialResolverConfiguration,
	stored: CredentialResolverConfiguration,
	secretNames: Set<string>,
): CredentialResolverConfiguration => {
	const result: CredentialResolverConfiguration = {};
	for (const [key, val] of Object.entries(incoming)) {
		if (secretNames.has(key) && val === CREDENTIAL_BLANKING_VALUE) {
			result[key] = key in stored ? stored[key] : val;
		} else {
			result[key] = restoreValue(val, stored[key], secretNames);
		}
	}
	return result;
};
