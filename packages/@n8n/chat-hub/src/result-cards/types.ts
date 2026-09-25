import type { ResultCard, ResultCardArchetype } from '@n8n/api-types';

export type FieldType =
	| 'string'
	| 'number'
	| 'boolean'
	| 'date'
	| 'email'
	| 'url'
	| 'object'
	| 'object<number>'
	| 'array<number>'
	| 'array<string>'
	| 'array<object>'
	| 'null';

export interface FieldInfo {
	/** `total`, `bySource`, `customer.name` — top level and one level deep */
	path: string;
	type: FieldType;
	/** First non-empty value, rendered and truncated to 40 chars */
	sample: string;
	/** Share of profiled items that have this path (0..1) */
	presence: number;
	/** Distinct rendered values among profiled items (capped at 20) */
	distinct: number;
}

/** Everything the mapper knows about one node run. Built server-side, plain JSON. */
export interface NodeRunFacts {
	nodeName: string;
	nodeType: string;
	typeVersion: number;
	resource?: string;
	operation?: string;
	runIndex: number;
	itemCount: number;
	/** First ≤ 20 output items, `json` only */
	items: Array<Record<string, unknown>>;
	/** File names (or property names) of binary data on the output items */
	binaryNames: string[];
	/** Node parameters with expressions replayed against the run (best effort) */
	params: Record<string, unknown>;
	fields: FieldInfo[];
	/** True for the `lastNodeExecuted` — the only node that may produce a generic card */
	isFinalOutput: boolean;
	workflow: { name: string; description?: string };
}

export type JevQuestion =
	| { type: 'choice'; instructions: string; criteria: Record<string, string | null> }
	| { type: 'noul'; instructions: string }
	| { type: 'score'; instructions: string };
export type JevQuestions = Record<string, JevQuestion>;

export type JevAnswer =
	| { choice: string; confidence?: number; probabilities?: Record<string, number> }
	| { noul: number }
	| { score: number };
export type JevAnswers = Record<string, JevAnswer>;

export interface JevState {
	workflow: { name: string; description?: string };
	node: { type: string; name: string; resource?: string; operation?: string };
	itemCount: number;
	fields: Array<{ path: string; type: FieldType; sample?: string }>;
}

export interface CandidateSet {
	facts: NodeRunFacts;
	/** Stable per data shape — the cache key for Jev answers */
	schemaHash: string;
	archetypes: ResultCardArchetype[];
	/** What we render with no answers at all */
	defaultCard: ResultCard;
	/** Empty when there is nothing worth asking — then Jev is not called */
	questions: JevQuestions;
	buildState(options?: { includeSamples?: boolean }): JevState;
	/** Apply answers; `null` means "no card" (the `include` gate said no) */
	apply(answers?: JevAnswers): ResultCard | null;
}
