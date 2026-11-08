import { WORKFLOW_EXECUTION_BLOCK_CAUSES, type WorkflowExecutionBlockCause } from '@n8n/api-types';
import { Expose } from 'class-transformer';
import {
	ArrayMaxSize,
	ArrayUnique,
	IsOptional,
	IsString,
	IsBoolean,
	IsArray,
	IsIn,
} from 'class-validator';

import { BaseFilter } from './base.filter.dto';

export class WorkflowFilter extends BaseFilter {
	@IsArray()
	@ArrayMaxSize(50)
	@ArrayUnique()
	@IsString({ each: true })
	@IsOptional()
	@Expose()
	ids?: string[];

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

	@IsArray()
	@ArrayUnique()
	@IsIn(WORKFLOW_EXECUTION_BLOCK_CAUSES, { each: true })
	@IsOptional()
	@Expose()
	executionBlockedBy?: WorkflowExecutionBlockCause[];

	static async fromString(rawFilter: string) {
		return await this.toFilter(rawFilter, WorkflowFilter);
	}
}
