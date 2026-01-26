import { Service } from '@n8n/di';
import type { IDataObject } from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';

import { CREDENTIAL_BLANKING_VALUE } from '@/constants';

import type { SecretsProvider } from './types';

/**
 * Service for redacting and unredacting sensitive values in secrets provider settings.
 * Handles password fields and OAuth token data.
 */
@Service()
export class SecretsRedactionService {
	/**
	 * Redact sensitive values in settings for API responses.
	 * Replaces password fields and oauth data with sentinel values.
	 */
	redact(data: IDataObject, provider: SecretsProvider): IDataObject {
		const copiedData = deepCopy(data ?? {});

		for (const dataKey of Object.keys(copiedData)) {
			if (this.shouldRedact(dataKey, copiedData[dataKey], provider)) {
				copiedData[dataKey] = CREDENTIAL_BLANKING_VALUE;
			}
		}

		return copiedData;
	}

	private shouldRedact(key: string, value: unknown, provider: SecretsProvider): boolean {
		// OAuth token data is always redacted
		if (key === 'oauthTokenData') {
			return true;
		}

		const prop = provider.properties.find((v) => v.name === key);
		if (!prop?.typeOptions?.password) {
			return false;
		}

		// Redact if noDataExpression or if it's a non-expression string
		if (prop.noDataExpression) {
			return true;
		}

		return typeof value === 'string' && !value.startsWith('=');
	}

	/**
	 * Unredact settings by merging redacted placeholders with saved values.
	 * Used when updating settings to preserve sensitive values that weren't changed.
	 */
	unredact(redactedData: IDataObject, savedData: IDataObject): IDataObject {
		const mergedData = deepCopy(redactedData ?? {});
		this.restoreRedactedValues(mergedData, savedData);
		return mergedData;
	}

	/**
	 * Recursively restore redacted values from saved data
	 */
	private restoreRedactedValues(target: IDataObject, source: IDataObject): void {
		for (const key of Object.keys(target)) {
			const value = target[key];

			if (value === CREDENTIAL_BLANKING_VALUE) {
				target[key] = source[key];
				continue;
			}

			const sourceValue = source[key];
			const isNestedObject =
				typeof value === 'object' &&
				value !== null &&
				typeof sourceValue === 'object' &&
				sourceValue !== null;

			if (isNestedObject) {
				this.restoreRedactedValues(value as IDataObject, sourceValue as IDataObject);
			}
		}
	}
}
