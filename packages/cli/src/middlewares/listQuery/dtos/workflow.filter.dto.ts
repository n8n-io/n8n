import { isObjectLiteral } from '@/utils';
import { IsOptional, IsString, IsBoolean, IsArray, validate } from 'class-validator';
import { instanceToPlain } from 'class-transformer';

export class WorkflowFilter {
	@IsString()
	@IsOptional()
	name: string;

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

	constructor(dto: unknown) {
		if (!isObjectLiteral(dto)) throw new Error('Filter must be an object literal');

		const onlyKnownFields = Object.fromEntries(
			Object.entries(dto).filter(([key]) => WorkflowFilter.filterableFields.has(key)),
		);

		Object.assign(this, onlyKnownFields);
	}

	async validate() {
		const result = await validate(this);

		if (result.length > 0) throw new Error('Parsed filter does not fit the schema');

		return instanceToPlain(this);
	}
}
