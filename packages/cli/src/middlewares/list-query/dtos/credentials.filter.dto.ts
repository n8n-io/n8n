import { Expose } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

import { BaseFilter } from './base.filter.dto';

export class CredentialsFilter extends BaseFilter {
	@IsString()
	@IsOptional()
	@Expose()
	name?: string;

	@IsString()
	@IsOptional()
	@Expose()
	type?: string;

	@IsString()
	@IsOptional()
	@Expose()
	projectId?: string;

	static async fromString(rawFilter: string) {
		return await this.toFilter(rawFilter, CredentialsFilter);
	}
}
