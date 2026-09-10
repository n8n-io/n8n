import type { JSONSchema7, JSONSchema7TypeName } from 'json-schema';
import type { IDataObject, IRunExecutionData } from 'n8n-workflow';

/** Items past this count add little to the observed key set but cost a full pass each. */
export const OUTPUT_SAMPLE_LIMIT = 50;

/** What the runtime returns while no execution has typed the items: an array of open objects. */
export const UNKNOWN_OUTPUT_SCHEMA: JSONSchema7 = {
	type: 'array',
	items: { type: 'object', additionalProperties: true },
};

/**
 * The items the runtime returns as `output`: the last run of the node that ran last,
 * first main output. Empty when the execution has no run data (oversized, crashed early).
 */
export function sampleOutputItems(data: IRunExecutionData | undefined): IDataObject[] {
	const lastNode = data?.resultData?.lastNodeExecuted;
	const runs = lastNode ? data?.resultData?.runData?.[lastNode] : undefined;
	const lastRun = runs?.[runs.length - 1];
	return (lastRun?.data?.main?.[0] ?? []).map((item) => item.json);
}

function kindOf(value: unknown): JSONSchema7TypeName {
	if (value === null) return 'null';
	if (Array.isArray(value)) return 'array';
	const type = typeof value;
	return type === 'string' || type === 'number' || type === 'boolean' ? type : 'object';
}

/** One kind → that type; `null` seen too → a type union; two kinds → any (an empty schema). */
function propertySchema(seen: Set<JSONSchema7TypeName>): JSONSchema7 {
	const nonNull = [...seen].filter((kind) => kind !== 'null');
	if (nonNull.length > 1) return {};
	if (nonNull.length === 0) return { type: 'null' };
	return { type: seen.has('null') ? [nonNull[0], 'null'] : nonNull[0] };
}

/**
 * The schema of the item array, from the kinds seen per key. Types only: the sample is
 * read unredacted, so no value may leave this function. A key some item lacks is not
 * required. `null` when there is nothing to sample.
 */
export function inferOutputSchema(items: IDataObject[]): JSONSchema7 | null {
	const sample = items.slice(0, OUTPUT_SAMPLE_LIMIT);
	if (sample.length === 0) return null;

	const kinds = new Map<string, Set<JSONSchema7TypeName>>();
	const counts = new Map<string, number>();
	for (const item of sample) {
		for (const [name, value] of Object.entries(item)) {
			if (value === undefined) continue;
			counts.set(name, (counts.get(name) ?? 0) + 1);
			kinds.set(name, (kinds.get(name) ?? new Set()).add(kindOf(value)));
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
