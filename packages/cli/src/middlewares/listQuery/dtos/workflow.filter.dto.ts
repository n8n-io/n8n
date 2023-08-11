import { isObjectLiteral } from '@/utils';
import {
	IsOptional,
	IsString,
	IsBoolean,
	IsArray,
	validateSync as classValidatorValidate,
} from 'class-validator';

type QueryFilter = Omit<WorkflowFilterDtoValidator, 'tags'> & { tags?: Array<{ name: string }> };

export class WorkflowFilterDtoValidator {
	@IsString()
	@IsOptional()
	name?: string;

	@IsBoolean()
	@IsOptional()
	active?: boolean;

	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	tags?: string[];

	static get filterableFields() {
		return new Set(['name', 'active', 'tags']);
	}

	static validate(data: unknown): QueryFilter {
		if (!isObjectLiteral(data)) throw new Error('Filter must be an object literal');

		const onlyKnownFields = Object.fromEntries(
			Object.entries(data).filter(([key]) => this.filterableFields.has(key)),
		);

		const result = classValidatorValidate(onlyKnownFields);

		if (result.length > 0) throw new Error('Parsed filter does not fit the schema');

		return onlyKnownFields;
	}
}
