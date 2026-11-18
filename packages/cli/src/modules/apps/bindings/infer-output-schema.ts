import type { AppJsonSchema } from '@n8n/api-types';
import type { IDataObject, IRunExecutionData } from 'n8n-workflow';

/** More items add little to the observed key set, but each costs a full pass. */
export const OUTPUT_SAMPLE_LIMIT = 50;

/** What a run returns while no execution has typed the items: an array of open objects. */
export const UNKNOWN_OUTPUT_SCHEMA: AppJsonSchema = {
	type: 'array',
	items: { type: 'object', additionalProperties: true },
};

type Kind = 'null' | 'array' | 'string' | 'number' | 'boolean' | 'object';

/** The items of the last run of the node that ran last, from all main outputs, like a run's `output`. */
export function sampleOutputItems(data: IRunExecutionData | undefined): IDataObject[] {
	const lastNode = data?.resultData?.lastNodeExecuted;
	const runs = lastNode ? data?.resultData?.runData?.[lastNode] : undefined;
	const lastRun = runs?.[runs.length - 1];
	return (lastRun?.data?.main ?? []).flatMap((items) => items ?? []).map((item) => item.json);
}

function kindOf(value: unknown): Kind {
	if (value === null) return 'null';
	if (Array.isArray(value)) return 'array';
	const type = typeof value;
	return type === 'string' || type === 'number' || type === 'boolean' ? type : 'object';
}

/** One kind gives that type. `null` and one kind give a union. Two kinds give an open schema. */
function propertySchema(seen: Set<Kind>): AppJsonSchema {
	const nonNull = [...seen].filter((kind) => kind !== 'null');
	if (nonNull.length > 1) return {};
	if (nonNull.length === 0) return { type: 'null' };
	return { type: seen.has('null') ? [nonNull[0], 'null'] : nonNull[0] };
}

/**
 * The schema of the item array, from the kinds seen for each key. Only types
 * leave this function, never values, because the sample is not redacted.
 * Returns `null` when there is nothing to sample.
 */
export function inferOutputSchema(items: IDataObject[]): AppJsonSchema | null {
	const sample = items.slice(0, OUTPUT_SAMPLE_LIMIT);
	if (sample.length === 0) return null;

	const kinds = new Map<string, Set<Kind>>();
	const counts = new Map<string, number>();
	for (const item of sample) {
		for (const [name, value] of Object.entries(item)) {
			if (value === undefined) continue;
			counts.set(name, (counts.get(name) ?? 0) + 1);
			kinds.set(name, (kinds.get(name) ?? new Set<Kind>()).add(kindOf(value)));
		}
	}

	const required = [...counts].filter(([, count]) => count === sample.length).map(([name]) => name);
	return {
		type: 'array',
		items: {
			type: 'object',
			properties: Object.fromEntries(
				[...kinds].map(([name, seen]) => [name, propertySchema(seen)]),
			),
			...(required.length > 0 ? { required } : {}),
		},
	};
}
