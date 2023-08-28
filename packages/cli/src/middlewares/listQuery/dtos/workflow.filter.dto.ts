import { IsOptional, IsString, IsBoolean, IsArray, validate } from 'class-validator';
import { Expose, instanceToPlain, plainToInstance } from 'class-transformer';
import { jsonParse } from 'n8n-workflow';
import { isObjectLiteral } from '@/utils';

export class WorkflowFilter {
	@IsString()
	@IsOptional()
	@Expose()
	name?: string;

	@IsBoolean()
	@IsOptional()
	@Expose()
	active?: boolean;

	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	@Expose()
	tags?: string[];

	static async fromString(rawFilter: string) {
		const dto = jsonParse(rawFilter, { errorMessage: 'Failed to parse filter JSON' });

		if (!isObjectLiteral(dto)) throw new Error('Filter must be an object literal');

		const instance = plainToInstance(WorkflowFilter, dto, {
			excludeExtraneousValues: true, // remove fields not in class
			exposeUnsetFields: false, // remove in-class undefined fields
		});

		await instance.validate();

		return instanceToPlain(instance);
	}

	private async validate() {
		const result = await validate(this);

		if (result.length > 0) throw new Error('Parsed filter does not fit the schema');
	}
}
