import type { IDataObject } from 'n8n-workflow';

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
