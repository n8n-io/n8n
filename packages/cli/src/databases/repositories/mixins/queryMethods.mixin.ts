import { jsonParse } from 'n8n-workflow';
import type { Constructor } from '@/Interfaces';
import * as utils from '@/utils';
import type { WorkflowSchema } from '../workflow.repository';
import type { Schema } from '../schema';

function hasFieldNamesGetter(schema: unknown): schema is { getFieldNames(): string[] } {
	return (schema as WorkflowSchema)?.getFieldNames !== undefined;
}

export function mixinQueryMethods<T extends Constructor<{}>>(base: T) {
	class Derived extends base {
		static toQueryFilter(rawFilter: string, schema: typeof Schema) {
			const asObj = jsonParse(rawFilter, { errorMessage: 'Failed to parse filter JSON' });

			const validFilter = new schema(asObj);

			return Object.fromEntries(
				Object.keys(validFilter).map((field: keyof Schema) => [field, validFilter[field]]),
			);
		}

		static toQuerySelect(rawSelect: string, schema: typeof Schema) {
			const asArr = jsonParse(rawSelect, { errorMessage: 'Failed to parse select JSON' });

			if (!utils.isStringArray(asArr)) {
				throw new Error('Parsed select is not a string array');
			}

			// strip out unknown fields
			const validSelect = hasFieldNamesGetter(schema)
				? asArr.filter((f) => schema.getFieldNames().includes(f))
				: asArr;

			return validSelect.reduce<Record<string, true>>((acc, field) => {
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
