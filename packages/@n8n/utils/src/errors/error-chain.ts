export type UnknownRecord = Readonly<Record<string, unknown>>;

/** Any non-null object. Unlike is-record.ts this accepts arrays, so a wrapped array stays in the chain. */
export const isObjectLike = (value: unknown): value is UnknownRecord =>
	typeof value === 'object' && value !== null;

const MAX_CHAIN_DEPTH = 5;

/** The keys errors wrap each other under. */
const WRAPPING_KEYS = ['cause', 'errorResponse', 'reason'] as const;

/** The error and the errors it wraps, shallowest first, each visited once. */
export function errorChain(error: unknown): UnknownRecord[] {
	if (!isObjectLike(error)) {
		return [];
	}

	const seen = new Set<UnknownRecord>([error]);
	const chain: UnknownRecord[] = [error];
	let generation: UnknownRecord[] = [error];

	for (let depth = 0; depth < MAX_CHAIN_DEPTH && generation.length > 0; depth++) {
		const next: UnknownRecord[] = [];
		for (const level of generation) {
			for (const key of WRAPPING_KEYS) {
				const wrapped = level[key];
				if (isObjectLike(wrapped) && !seen.has(wrapped)) {
					seen.add(wrapped);
					next.push(wrapped);
				}
			}
		}
		chain.push(...next);
		generation = next;
	}

	return chain;
}
