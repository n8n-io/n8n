import { IsOptional, IsString, IsBoolean, validate } from 'class-validator';
import { Expose, instanceToPlain, plainToInstance } from 'class-transformer';
import { jsonParse } from 'n8n-workflow';
import { isObjectLiteral } from '@/utils';

export class UserFilter {
	@IsString()
	@IsOptional()
	@Expose()
	email?: string;

	@IsBoolean()
	@IsOptional()
	@Expose()
	isOwner?: boolean;

	static async fromString(rawFilter: string) {
		const dto = jsonParse(rawFilter, { errorMessage: 'Failed to parse filter JSON' });

		if (!isObjectLiteral(dto)) throw new Error('Filter must be an object literal');

		const instance = plainToInstance(UserFilter, dto, {
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
