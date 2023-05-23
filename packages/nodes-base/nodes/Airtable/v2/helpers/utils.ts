import type { IDataObject, NodeApiError } from 'n8n-workflow';
import type { UpdateRecord } from './interfaces';

export function removeIgnored(data: IDataObject, ignore: string) {
	if (ignore) {
		const ignoreFields = ignore.split(',').map((field) => field.trim());

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
	key: string,
	value: IDataObject | string,
	updateAll?: boolean,
) {
	if (updateAll) {
		const matches = data.filter((record) => {
			return record.fields[key] === value;
		});

		if (!matches?.length) {
			throw new Error(`No record found where: ${key} = ${value}`);
		}

		return matches;
	} else {
		const match = data.find((record) => {
			return record.fields[key] === value;
		});

		if (!match) {
			throw new Error(`No record found where: ${key} = ${value}`);
		}

		return [match];
	}
}

export function processAirtableError(error: NodeApiError, id?: string) {
	if (error.description === 'NOT_FOUND' && id) {
		error.description = `${id} is not a valid Record ID`;
	}
	if (error.description?.includes('You must provide an array of up to 10 record objects') && id) {
		error.description = `${id} is not a valid Record ID`;
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
