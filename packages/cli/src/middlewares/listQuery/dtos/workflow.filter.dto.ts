import {
	IsOptional,
	IsString,
	IsBoolean,
	IsArray,
	validateSync as classValidatorValidate,
} from 'class-validator';

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
		return ['id', 'name', 'active', 'tags'];
	}

	validate() {
		const result = classValidatorValidate(this);

		if (result.length > 0) throw new Error('Parsed filter does not fit the schema');

		return this;
	}

	constructor(data: object) {
		const { filterableFields } = WorkflowFilterDtoValidator;

		const onlyKnownFields = Object.fromEntries(
			Object.entries(data).filter(([key]) => filterableFields.includes(key)),
		);

		Object.assign(this, onlyKnownFields);
	}
}
