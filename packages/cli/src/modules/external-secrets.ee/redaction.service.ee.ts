import { Service } from '@n8n/di';
import type { IDataObject, INodeProperties } from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';

import { CREDENTIAL_BLANKING_VALUE } from '@/constants';

@Service()
export class RedactionService {
	/**
	 * Redacts sensitive fields based on provider properties
	 * @param data - Settings to redact
	 * @param properties - INodeProperties[] defining which fields are sensitive
	 * @returns Deep copy with sensitive values replaced by CREDENTIAL_BLANKING_VALUE
	 */
	redact(data: IDataObject, properties: INodeProperties[]): IDataObject {
		const copiedData = deepCopy(data || {});

		const fieldsToRedact = properties
			.filter((prop) => prop.typeOptions?.password)
			.map((prop) => prop.name);

		for (const fieldName of fieldsToRedact) {
			if (fieldName in copiedData && this.shouldRedactValue(copiedData[fieldName])) {
				copiedData[fieldName] = CREDENTIAL_BLANKING_VALUE;
			}
		}

		// Always redact oauthTokenData regardless of type
		if ('oauthTokenData' in copiedData) {
			copiedData.oauthTokenData = CREDENTIAL_BLANKING_VALUE;
		}

		return copiedData;
	}

	/**
	 * Unredacts data by merging with saved values
	 * @param redactedData - Data with blanked values (from client)
	 * @param savedData - Complete data from database
	 * @returns Merged data with blanked values restored
	 */
	unredact(redactedData: IDataObject, savedData: IDataObject): IDataObject {
		const mergedData = deepCopy(redactedData ?? {});
		this.unredactRestoreValues(mergedData, savedData);
		return mergedData;
	}

	/**
	 * Determines if a value should be redacted
	 * @param value - Value to check
	 * @returns True if value should be redacted
	 */
	private shouldRedactValue(value: unknown): boolean {
		// Only redact string values that are not expressions (starting with '=')
		return typeof value === 'string' && !value.startsWith('=');
	}

	/**
	 * Recursively replaces blanking values with saved values
	 * @param unmerged - Data to update (modified in place)
	 * @param replacement - Saved data to restore from
	 */
	private unredactRestoreValues(unmerged: any, replacement: any): void {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		for (const [key, value] of Object.entries(unmerged)) {
			if (value === CREDENTIAL_BLANKING_VALUE) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
				unmerged[key] = replacement[key];
			} else if (
				typeof value === 'object' &&
				value !== null &&
				key in replacement &&
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				typeof replacement[key] === 'object' &&
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				replacement[key] !== null
			) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				this.unredactRestoreValues(value, replacement[key]);
			}
		}
	}
}
