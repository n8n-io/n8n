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
	id?: string;

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
		return ['name', 'active', 'tags'];
	}

	static validate(data: object): QueryFilter {
		const { filterableFields } = WorkflowFilterDtoValidator;

		const onlyKnownFields = Object.fromEntries(
			Object.entries(data).filter(([key]) => filterableFields.includes(key)),
		);

		const result = classValidatorValidate(onlyKnownFields);

		if (result.length > 0) throw new Error('Parsed filter does not fit the schema');

		return onlyKnownFields;
	}
}
