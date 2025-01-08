import { Expose } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

import { BaseFilter } from './base.filter.dto';

export class TestDefinitionsFilter extends BaseFilter {
	@IsString()
	@IsOptional()
	@Expose()
	workflowId?: string;

	static async fromString(rawFilter: string) {
		return await this.toFilter(rawFilter, TestDefinitionsFilter);
	}
}
