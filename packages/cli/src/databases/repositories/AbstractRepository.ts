import { Repository } from 'typeorm';
import type { WorkflowEntity } from '../entities/WorkflowEntity';
import { jsonParse } from 'n8n-workflow';
import type { Constructor } from '@/Interfaces';
import {
	IsString,
	IsBoolean,
	IsOptional,
	IsArray,
	IsDateString,
	isArray,
	validateSync,
} from 'class-validator';

namespace WorkflowsQuery {
	export class Filter {
		constructor(data: unknown) {
			Object.assign(this, data);
			const result = validateSync(this, { whitelist: true }); // strip unknown properties

			if (result.length > 0) {
				throw new Error('Parsed filter does not fit the schema');
			}
		}

		@IsOptional()
		@IsString()
		id: string;

		@IsOptional()
		@IsString()
		name: string;

		@IsOptional()
		@IsBoolean()
		active: boolean;

		@IsOptional()
		@IsArray()
		@IsString({ each: true })
		nodes: string[];

		@IsOptional()
		@IsDateString()
		createdAt: Date;

		@IsOptional()
		@IsDateString()
		updatedAt: Date;

		static getFieldNames() {
			// @TODO: How to get these dynamically?
			return ['id', 'name', 'active', 'nodes', 'createdAt', 'updatedAt'];
		}
	}
}

function mixinQueryMethods<T extends Constructor<{}>>(base: T) {
	class Derived extends base {
		static toQueryFilter(rawFilter: string) {
			const parsedFilter = new WorkflowsQuery.Filter(
				jsonParse(rawFilter, { errorMessage: 'Failed to parse filter JSON' }),
			);

			return Object.fromEntries(
				Object.keys(parsedFilter).map((field: keyof WorkflowsQuery.Filter) => [
					field,
					parsedFilter[field],
				]),
			);
		}

		static toQuerySelect(rawSelect: string) {
			const parsedSelect = jsonParse<string[]>(rawSelect, {
				errorMessage: 'Failed to parse select JSON',
			});

			if (!isArray(parsedSelect) || parsedSelect.some((i) => typeof i !== 'string')) {
				throw new Error('Parsed select is not a string array');
			}

			return parsedSelect.reduce<Record<string, true>>((acc, field) => {
				if (!WorkflowsQuery.Filter.getFieldNames().includes(field)) return acc;
				return (acc[field] = true), acc;
			}, {});
		}

		static toPaginationOptions(rawTake: string, rawSkip = '0') {
			const MAX_ITEMS = 50;

			const [take, skip] = [rawTake, rawSkip].map((o) => parseInt(o, 10));

			return { skip, take: Math.min(take, MAX_ITEMS) };
		}
	}

	return Derived;
}

/* eslint-disable @typescript-eslint/naming-convention */
export const BaseWorkflowRepository = mixinQueryMethods(Repository<WorkflowEntity>);
