import { Repository } from 'typeorm';
import type { WorkflowEntity } from '../entities/WorkflowEntity';
import { jsonParse } from 'n8n-workflow';
import type { JsonValue } from 'n8n-workflow';
import * as utils from '@/utils';
import { validate as jsonSchemaValidate } from 'jsonschema';
import type { Constructor } from '@/Interfaces';

type ParsedJSON = JsonValue;

function mixinQueryMethods<T extends Constructor<{}>>(base: T) {
	class Derived extends base {
		static toQueryFilter(rawFilter: string, schema: { properties: object }) {
			const parsedFilter = jsonParse<ParsedJSON>(rawFilter, {
				errorMessage: 'Failed to parse JSON into filter object',
			});

			if (!utils.isObjectLiteral(parsedFilter)) {
				throw new Error('Parsed filter is not an object');
			}

			const queryFilter = Object.fromEntries(
				Object.keys(parsedFilter)
					.filter((field) => Object.keys(schema.properties).includes(field))
					.map((field) => [field, parsedFilter[field]]),
			);

			const fitsSchema = jsonSchemaValidate(queryFilter, schema).valid;

			if (!fitsSchema) throw new Error('Parsed filter object does not fit schema');

			return queryFilter;
		}

		static toQuerySelect(rawSelect: string, schema: { properties: object }) {
			const parsedSelect = jsonParse(rawSelect, {
				errorMessage: 'Failed to parse JSON into select array',
			});

			if (!utils.isStringArray(parsedSelect)) {
				throw new Error('Parsed select is not a string array');
			}

			const keys = Object.keys(schema.properties);

			return parsedSelect.reduce<Record<string, boolean>>((acc, field) => {
				if (!keys.includes(field)) return acc;
				return (acc[field] = true), acc;
			}, {});
		}

		static toPaginationOptions(rawTake: string, rawSkip: string = '0') {
			const MAX_ITEMS = 50;

			const [take, skip] = [rawTake, rawSkip].map((o) => parseInt(o, 10));

			return { skip, take: Math.min(take, MAX_ITEMS) };
		}
	}

	return Derived;
}

/* eslint-disable @typescript-eslint/naming-convention */
export const BaseWorkflowRepository = mixinQueryMethods(Repository<WorkflowEntity>);
