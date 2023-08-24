import { isStringArray } from '@/utils';
import { jsonParse } from 'n8n-workflow';

export class UserSelect {
	fields: string[];

	static get selectableFields() {
		return new Set(['id', 'email', 'firstName', 'lastName']);
	}

	static fromString(rawFilter: string) {
		const dto = jsonParse(rawFilter, { errorMessage: 'Failed to parse filter JSON' });

		if (!isStringArray(dto)) throw new Error('Parsed select is not a string array');

		return dto.reduce<Record<string, true>>((acc, field) => {
			if (!UserSelect.selectableFields.has(field)) return acc;
			return (acc[field] = true), acc;
		}, {});
	}
}
