import { IsOptional, IsString } from 'class-validator';
import { Expose } from 'class-transformer';
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

	static async fromString(rawFilter: string) {
		return this.toFilter(rawFilter, CredentialsFilter);
	}
}
