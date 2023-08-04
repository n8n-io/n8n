import { Service } from 'typedi';
import { DataSource, Repository } from 'typeorm';
import { WorkflowEntity } from '../entities/WorkflowEntity';
import type { FindOptionsSelect } from 'typeorm';
import { jsonParse, type JsonValue } from 'n8n-workflow';
import * as utils from '@/utils';
import { validate as jsonSchemaValidate } from 'jsonschema';
import type { QueryFilters } from '../types';

type ParsedJSON = JsonValue;

@Service()
export class WorkflowRepository extends Repository<WorkflowEntity> {
	constructor(dataSource: DataSource) {
		super(WorkflowEntity, dataSource.manager);
	}

	private static schemas = {
		queryFilters: {
			getWorkflows: {
				$id: 'GetWorkflowsQueryFilter',
				type: 'object',
				properties: {
					id: { anyOf: [{ type: 'integer' }, { type: 'string' }] },
					name: { type: 'string' },
					active: { type: 'boolean' },
				},
			},
		},
	};

	static toQueryFilter(rawFilter?: string): QueryFilters.GetAllWorkflows {
		if (!rawFilter) return {};

		const parsedFilter = jsonParse<ParsedJSON>(rawFilter, {
			errorMessage: 'Failed to parse JSON into filter object',
		});

		if (!utils.isObjectLiteral(parsedFilter)) {
			throw new Error('Parsed filter is not an object');
		}

		const schema = this.schemas.queryFilters.getWorkflows;

		const queryFilter = Object.fromEntries(
			Object.keys(parsedFilter)
				.filter((field) => Object.keys(schema.properties).includes(field))
				.map((field) => [field, parsedFilter[field]]),
		);

		const fitsSchema = jsonSchemaValidate(queryFilter, schema).valid;

		if (!fitsSchema) throw new Error('Parsed filter object does not fit schema');

		return queryFilter;
	}

	static toQuerySelect(rawSelect: string): FindOptionsSelect<WorkflowEntity> {
		const parsedSelect = jsonParse<Array<keyof WorkflowEntity>>(rawSelect, {
			errorMessage: 'Failed to parse JSON into select array',
		});

		if (!Array.isArray(parsedSelect)) {
			throw new Error('Parsed select is not an array');
		}

		const keys = Object.keys(this.schemas.queryFilters.getWorkflows.properties);

		return parsedSelect.reduce<Record<string, boolean>>((acc, field) => {
			if (!keys.includes(field)) return acc;
			return (acc[field] = true), acc;
		}, {});
	}

	static toPaginationOptions(rawTake: string, rawSkip?: string) {
		const MAX_ITEMS = 50;

		const [skip, take] = [rawSkip ?? '0', rawTake].map((o) => parseInt(o, 10));

		return { skip, take: Math.min(take, MAX_ITEMS) };
	}
}
