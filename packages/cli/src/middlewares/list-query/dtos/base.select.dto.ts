import { isStringArray } from '@n8n/db';
import { jsonParse } from 'n8n-workflow';
import { UnexpectedError } from '@n8n/errors';

export class BaseSelect {
	static selectableFields: Set<string>;

	protected static toSelect(rawFilter: string, Select: typeof BaseSelect) {
		const dto = jsonParse(rawFilter, { errorMessage: 'Failed to parse filter JSON' });

		if (!isStringArray(dto)) throw new UnexpectedError('Parsed select is not a string array');

		return dto.reduce<Record<string, true>>((acc, field) => {
			if (!Select.selectableFields.has(field)) return acc;
			return (acc[field] = true), acc;
		}, {});
	}
}
