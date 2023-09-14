/* eslint-disable @typescript-eslint/naming-convention */

import { isObjectLiteral } from '@/utils';
import { plainToInstance, instanceToPlain } from 'class-transformer';
import { validate } from 'class-validator';
import { jsonParse } from 'n8n-workflow';

export class BaseFilter {
	protected static async toFilter(rawFilter: string, Filter: typeof BaseFilter) {
		const dto = jsonParse(rawFilter, { errorMessage: 'Failed to parse filter JSON' });

		if (!isObjectLiteral(dto)) throw new Error('Filter must be an object literal');

		const instance = plainToInstance(Filter, dto, {
			excludeExtraneousValues: true, // remove fields not in class
		});

		await instance.validate();

		return instanceToPlain(instance, {
			exposeUnsetFields: false, // remove in-class undefined fields
		});
	}

	private async validate() {
		const result = await validate(this);

		if (result.length > 0) throw new Error('Parsed filter does not fit the schema');
	}
}
