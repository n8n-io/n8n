import { Expose } from 'class-transformer';
import { IsOptional, IsString, IsBoolean, IsArray } from 'class-validator';

import { BaseFilter } from './base.filter.dto';

export class WorkflowFilter extends BaseFilter {
	@IsString()
	@IsOptional()
	@Expose()
	query?: string;

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

	@IsBoolean()
	@IsOptional()
	@Expose()
	availableInMCP?: boolean;

	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	@Expose()
	nodeTypes?: string[];

	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	@Expose()
	triggerNodeTypes?: string[];

	/**
	 * When `true`, the list is widened to include workflows that the workflow
	 * identified by `parentWorkflowId` is permitted to call, even if those
	 * workflows are not directly shared with the requesting user.
	 */
	@IsBoolean()
	@IsOptional()
	@Expose()
	includeCallableSubworkflows?: boolean;

	/**
	 * ID of the workflow that will act as the caller.
	 * Used together with `includeCallableSubworkflows` to evaluate `callerPolicy`.
	 */
	@IsString()
	@IsOptional()
	@Expose()
	parentWorkflowId?: string;

	static async fromString(rawFilter: string) {
		return await this.toFilter(rawFilter, WorkflowFilter);
	}
}
