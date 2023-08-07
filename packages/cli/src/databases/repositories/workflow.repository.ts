import { Service } from 'typedi';
import { DataSource, Repository } from 'typeorm';
import { WorkflowEntity } from '../entities/WorkflowEntity';
import { mixinQueryMethods } from './mixins/queryMethods.mixin';
import {
	validateSync,
	IsOptional,
	IsString,
	IsBoolean,
	IsArray,
	IsDateString,
} from 'class-validator';
import { Schema } from './schema';

export class WorkflowSchema extends Schema {
	constructor(data: unknown = {}) {
		super();
		Object.assign(this, data);

		// strip out unknown fields
		const result = validateSync(this, { whitelist: true });

		if (result.length > 0) {
			throw new Error('Parsed filter does not fit the schema');
		}
	}

	@IsOptional()
	@IsString()
	id?: string = undefined;

	@IsOptional()
	@IsString()
	name?: string = undefined;

	@IsOptional()
	@IsBoolean()
	active?: boolean = undefined;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	nodes?: string[] = undefined;

	@IsOptional()
	@IsDateString()
	createdAt?: Date = undefined;

	@IsOptional()
	@IsDateString()
	updatedAt?: Date = undefined;

	static getFieldNames() {
		return Object.getOwnPropertyNames(new WorkflowSchema());
	}
}

@Service()
export class WorkflowRepository extends mixinQueryMethods(Repository<WorkflowEntity>) {
	constructor(dataSource: DataSource) {
		super(WorkflowEntity, dataSource.manager);
	}

	static toQueryFilter(rawFilter: string) {
		return super.toQueryFilter(rawFilter, WorkflowSchema);
	}

	static toQuerySelect(rawFilter: string) {
		return super.toQuerySelect(rawFilter, WorkflowSchema);
	}
}
