import type { NodeRunFacts } from './types';

/** FNV-1a 32-bit — stable, dependency-free, fine for a cache key (not security). */
function fnv1a(input: string): string {
	let hash = 0x811c9dc5;
	for (let i = 0; i < input.length; i++) {
		hash ^= input.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193) >>> 0;
	}
	return hash.toString(16).padStart(8, '0');
}

/** Same node type + operation + field paths/types ⇒ same hash, regardless of values or counts. */
export function schemaHash(facts: NodeRunFacts): string {
	const shape = [...facts.fields]
		.map((field) => `${field.path}:${field.type}`)
		.sort()
		.join(',');
	return fnv1a(
		`${facts.nodeType}|${facts.resource ?? ''}|${facts.operation ?? ''}|${facts.isFinalOutput ? 'final' : 'side'}|${shape}`,
	);
}
