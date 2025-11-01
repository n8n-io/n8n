import set from 'lodash/set';
import { ApplicationError, type IDataObject, type NodeApiError } from 'n8n-workflow';

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

export const flattenOutput = (record: IDataObject) => {
	const { fields, ...rest } = record;
	return {
		...rest,
		...(fields as IDataObject),
	};
};
