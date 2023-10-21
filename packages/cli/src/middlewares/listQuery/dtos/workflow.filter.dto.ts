import { IsOptional, IsString, IsBoolean, IsArray } from 'class-validator';
import { Expose } from 'class-transformer';

import { BaseFilter } from './base.filter.dto';

export class WorkflowFilter extends BaseFilter {
	@IsString()
	@IsOptional()
	@Expose()
	name?: string;

	@IsString()
	@IsOptional()
	@Expose()
	folder?: string;

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
		return this.toFilter(rawFilter, WorkflowFilter);
	}
}
