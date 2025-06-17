import { Expose } from 'class-transformer';
import { IsOptional, IsString, IsBoolean, IsArray } from 'class-validator';
import { WorkflowStatus } from 'n8n-workflow';

import { BaseFilter } from './base.filter.dto';

export class WorkflowFilter extends BaseFilter {
	@IsString()
	@IsOptional()
	@Expose()
	name?: string;

	@IsBoolean()
	@IsOptional()
	@Expose()
	active?: boolean;

	@IsBoolean()
	@IsOptional()
	@Expose()
	isArchived?: boolean;

	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	@Expose()
	tags?: string[];

	@IsString()
	@IsOptional()
	@Expose()
	projectId?: string;

	@IsString()
	@IsOptional()
	@Expose()
	parentFolderId?: string;

	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	@Expose()
	status?: WorkflowStatus[];

	static async fromString(rawFilter: string) {
		return await this.toFilter(rawFilter, WorkflowFilter);
	}
}
