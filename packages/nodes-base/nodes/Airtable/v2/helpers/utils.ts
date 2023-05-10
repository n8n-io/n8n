import type { IDataObject } from 'n8n-workflow';
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
			throw new Error(`No record found with ${key} = ${value}`);
		}

		return matches;
	} else {
		const match = data.find((record) => {
			return record.id === value;
		});

		if (!match) {
			throw new Error(`No record found with id = ${value}`);
		}

		return [match];
	}
}
