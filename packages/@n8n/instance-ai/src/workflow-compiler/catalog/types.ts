import type { DataContract } from '../ir/schema';

/** Splits a comma-separated keyword list. Keywords may contain spaces. */
export const kw = (list: string): string[] => list.split(',').map((keyword) => keyword.trim());

export type OperationKind = 'trigger' | 'action' | 'control' | 'respond';

export interface ParameterDefinition {
	/** Semantic name used by IR params and requirements, e.g. `channel`. */
	name: string;
	/** Dot path in the node's `parameters` object the value binds to. */
	path: string;
	type: 'string' | 'number' | 'boolean' | 'json' | 'enum' | 'resource_locator';
	required: boolean;
	description: string;
	/** Allowed values for `enum` parameters. */
	options?: readonly string[];
	/** Resource-locator mode to wrap plain values in (`{ __rl: true, mode, value }`). */
	locatorMode?: 'id' | 'name' | 'list' | 'url';
	/** Requirement question shown when the value is missing. */
	question?: string;
	/** The planner or compiler derives the value; never ask the user for it. */
	derivable?: boolean;
}

export interface CredentialRequirement {
	type: string;
	required: boolean;
}

export interface NodeOperation {
	/** Stable registry id: `<integration>.<resource>.<operation>` or `<node>`. */
	id: string;
	nodeType: string;
	version: number;
	integration: string;
	resource?: string;
	operation?: string;
	kind: OperationKind;
	title: string;
	/** Default node name; falls back to the title. */
	label?: string;
	description: string;
	/** Retrieval vocabulary: synonyms, verbs, product names. */
	keywords: readonly string[];
	/** Discriminator parameters that select this operation on the node. */
	baseParameters: Readonly<Record<string, unknown>>;
	requiredParameters: readonly ParameterDefinition[];
	optionalParameters: readonly ParameterDefinition[];
	credentials: readonly CredentialRequirement[];
	/** Named main outputs; a single `main` output when omitted. */
	outputs?: readonly string[];
	outputContract?: DataContract;
	/** Known caveats surfaced as informational warnings. */
	limitations?: readonly string[];
	/** Suggested rate limit for fan-out patterns. */
	rateLimit?: { requestsPerSecond: number };
}
