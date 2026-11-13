/**
 * Picks the library node sources that a workflow needs.
 *
 * The node library has many generated nodes. Type-checking and validating
 * all of them for each compile is slow, so the compiler and the reference
 * runner load only the nodes whose type the workflow source names in a
 * string literal. `ctx.node` links a library node only when its `type` is a
 * string literal, so this finds every node that can link.
 */
import { NODE_INDEX, NODE_SOURCES } from '../generated/sources.generated.ts';

const QUOTED = /(['"`])([^'"`\s]+)\1/g;

export function selectNodeSources(
	source: string,
	sources: Record<string, string> = NODE_SOURCES,
	index: Record<string, string> = NODE_INDEX,
): Record<string, string> {
	const out: Record<string, string> = {};
	for (const match of source.matchAll(QUOTED)) {
		const file = index[match[2]];
		const text = file === undefined ? undefined : sources[file];
		if (file !== undefined && text !== undefined) out[file] = text;
	}
	return out;
}

/** The library node types. */
export function libraryNodeTypes(): string[] {
	return Object.keys(NODE_INDEX).sort();
}
