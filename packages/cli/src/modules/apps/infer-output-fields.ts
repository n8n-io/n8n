import type { OutputFieldDef } from '@n8n/api-types';
import type { IDataObject, IRunExecutionData } from 'n8n-workflow';

/** Items past this count add little to the observed key set but cost a full pass each. */
export const OUTPUT_SAMPLE_LIMIT = 50;

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

type ValueKind = Exclude<OutputFieldDef['type'], 'null' | 'unknown'>;

function kindOf(value: unknown): ValueKind | 'null' {
	if (value === null) return 'null';
	if (Array.isArray(value)) return 'array';
	const type = typeof value;
	return type === 'string' || type === 'number' || type === 'boolean' ? type : 'object';
}

/**
 * Types only: the sample is read unredacted, so no value may leave this function. Each
 * key gets the one kind seen across items, `'unknown'` when items disagree, `'null'` when
 * only null was seen. `'unknown'` overall when there is nothing to sample.
 */
export function inferOutputFields(items: IDataObject[]): OutputFieldDef[] | 'unknown' {
	const sample = items.slice(0, OUTPUT_SAMPLE_LIMIT);
	if (sample.length === 0) return 'unknown';

	const kinds = new Map<string, Set<ValueKind | 'null'>>();
	const counts = new Map<string, number>();
	for (const item of sample) {
		for (const [name, value] of Object.entries(item)) {
			if (value === undefined) continue;
			counts.set(name, (counts.get(name) ?? 0) + 1);
			kinds.set(name, (kinds.get(name) ?? new Set()).add(kindOf(value)));
		}
	}

	return [...kinds].map(([name, seen]) => {
		const nonNull = [...seen].filter((kind): kind is ValueKind => kind !== 'null');
		return {
			name,
			type: nonNull.length === 0 ? 'null' : nonNull.length === 1 ? nonNull[0] : 'unknown',
			nullable: seen.has('null'),
			optional: (counts.get(name) ?? 0) < sample.length,
		};
	});
}
