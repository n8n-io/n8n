import {
	IsOptional,
	IsString,
	IsBoolean,
	IsArray,
	validateSync as classValidatorValidate,
} from 'class-validator';

export class WorkflowFilterDtoValidator {
	@IsOptional()
	@IsString()
	id?: string;

	@IsOptional()
	@IsString()
	name?: string;

	@IsOptional()
	@IsBoolean()
	active?: boolean;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	tags?: string[];

	static get filterFields() {
		return ['id', 'name', 'active', 'tags'];
	}

	private static removeUnknownFields(obj: object) {
		const { filterFields } = WorkflowFilterDtoValidator;

		return Object.fromEntries(
			Object.entries(obj).filter(([key]) => filterFields.includes(key)),
		) as WorkflowFilterDtoValidator;
	}

	validate() {
		const sanitized = WorkflowFilterDtoValidator.removeUnknownFields(this);

		const result = classValidatorValidate(sanitized);

		if (result.length > 0) throw new Error('Parsed filter does not fit the schema');

		return sanitized;
	}

	constructor(data: unknown) {
		Object.assign(this, data);
	}
}
