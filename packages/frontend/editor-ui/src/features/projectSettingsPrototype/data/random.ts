/** FNV-1a over the string's UTF-16 code units. */
export function hashString(input: string): number {
	let hash = 2166136261;
	for (let i = 0; i < input.length; i += 1) {
		hash ^= input.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

/** mulberry32 over a string hash: the same seed always gives the same sequence. */
export function seeded(seed: string): () => number {
	let state = hashString(seed);
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** An integer from `min` to `max`, both included. */
export function intBetween(next: () => number, min: number, max: number): number {
	return min + Math.floor(next() * (max - min + 1));
}

export function pick<T>(next: () => number, list: readonly T[]): T {
	return list[Math.floor(next() * list.length)];
}

/** `count` different items, in a seeded order. */
export function sample<T>(next: () => number, list: readonly T[], count: number): T[] {
	const pool = [...list];
	const result: T[] = [];
	const total = Math.min(count, pool.length);
	for (let i = 0; i < total; i += 1) {
		result.push(pool.splice(Math.floor(next() * pool.length), 1)[0]);
	}
	return result;
}
