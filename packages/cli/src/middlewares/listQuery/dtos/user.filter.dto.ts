import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Expose } from 'class-transformer';
import { BaseFilter } from './base.filter.dto';

export class UserFilter extends BaseFilter {
	@IsString()
	@IsOptional()
	@Expose()
	email?: string;

	@IsString()
	@IsOptional()
	@Expose()
	firstName?: string;

	@IsString()
	@IsOptional()
	@Expose()
	lastName?: string;

	@IsBoolean()
	@IsOptional()
	@Expose()
	isOwner?: boolean;

	static async fromString(rawFilter: string) {
		return this.toFilter(rawFilter, UserFilter);
	}
}
