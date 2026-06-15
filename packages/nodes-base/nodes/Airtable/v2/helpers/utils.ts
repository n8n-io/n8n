import set from 'lodash/set';
import {
	ApplicationError,
	isResourceMapperValue,
	type IDataObject,
	type NodeApiError,
} from 'n8n-workflow';

import type { UpdateRecord } from './interfaces';

export function removeIgnored(data: IDataObject, ignore: string | string[]) {
	if (ignore) {
		let ignoreFields: string[] = [];

		if (typeof ignore === 'string') {
			ignoreFields = ignore.split(',').map((field) => field.trim());
		} else {
			ignoreFields = ignore;
		}

		const newData: IDataObject = {};

		for (const field of Object.keys(data)) {
			if (!ignoreFields.includes(field)) {
				newData[field] = data[field];
			}
		}

		return newData;
	} else {
		return data;
	}
}

export function findMatches(
	data: UpdateRecord[],
	keys: string[],
	fields: IDataObject,
	updateAll?: boolean,
) {
	if (updateAll) {
		const matches = data.filter((record) => {
			for (const key of keys) {
				if (record.fields[key] !== fields[key]) {
					return false;
				}
			}
			return true;
		});

		if (!matches?.length) {
			throw new ApplicationError('No records match provided keys', { level: 'warning' });
		}

		return matches;
	} else {
		const match = data.find((record) => {
			for (const key of keys) {
				if (record.fields[key] !== fields[key]) {
					return false;
				}
			}
			return true;
		});

		if (!match) {
			throw new ApplicationError('Record matching provided keys was not found', {
				level: 'warning',
			});
		}

		return [match];
	}
}

export function processAirtableError(error: NodeApiError, id?: string, itemIndex?: number) {
	if (error.description === 'NOT_FOUND' && id) {
		error.description = `${id} is not a valid Record ID`;
	}
	if (error.description?.includes('You must provide an array of up to 10 record objects') && id) {
		error.description = `${id} is not a valid Record ID`;
	}

	if (itemIndex !== undefined) {
		set(error, 'context.itemIndex', itemIndex);
	}

	return error;
}

export function legacyFlattenOutput(record: IDataObject, nodeVersion: number): IDataObject {
	if (nodeVersion >= 2.2) return record;
	const { fields, ...rest } = record;
	return {
		...rest,
		...(fields as IDataObject),
	};
}

function isIDataObjectArray(value: unknown): value is IDataObject[] {
	return Array.isArray(value);
}

/**
 * When typecast is enabled, `skipValidation: true` is passed to `getNodeParameter`, which bypasses
 * the type coercion step in `validateResourceMapperValue`. For `array`-type fields (e.g.
 * multipleAttachments), values may be stored as JSON strings and need to be parsed into actual
 * arrays before being sent to the Airtable API.
 */
export function coerceArrayTypeFields(fields: IDataObject, columnsParam: unknown): void {
	if (!isResourceMapperValue(columnsParam)) return;
	for (const schemaField of columnsParam.schema) {
		if (schemaField.type !== 'array') continue;
		const value = fields[schemaField.id];
		if (typeof value !== 'string') continue;
		try {
			const parsed: unknown = JSON.parse(value);
			if (isIDataObjectArray(parsed)) {
				fields[schemaField.id] = parsed;
			}
		} catch {
			// Keep original string value if not parseable as array
		}
	}
}
