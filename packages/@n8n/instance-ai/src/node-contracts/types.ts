/**
 * AI-first action contracts (spike, NODE-6071). One contract per action: the agent reads
 * `input` / `output` / `flow`, and the builder compiles contract input back to the legacy
 * node type, version, and parameters. See the Notion spec "Part 1: the contract format".
 */

/** The JSON Schema (2020-12) subset the contracts use, plus the closed `x-n8n-*` vocabulary. */
export interface JsonSchema {
	type?: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';
	description?: string;
	enum?: readonly unknown[];
	const?: unknown;
	default?: unknown;
	format?: string;
	minLength?: number;
	minItems?: number;
	properties?: Record<string, JsonSchema>;
	required?: readonly string[];
	/** Unknown keys are rejected unless this is set. */
	additionalProperties?: boolean | JsonSchema;
	/** Output only: keys matching a pattern (Notion `property_*`). */
	patternProperties?: Record<string, JsonSchema>;
	items?: JsonSchema;
	oneOf?: readonly JsonSchema[];
	anyOf?: readonly JsonSchema[];
	discriminator?: { propertyName: string };
	/** Footgun hint, at most 80 characters. */
	'x-n8n-hint'?: string;
	/** The value must be a literal (for example a binary property name), never an expression. */
	'x-n8n-literal'?: boolean;
	/** Value types by source type (Notion property type), shown to the agent as a table. */
	'x-n8n-value-types'?: Record<string, JsonSchema>;
	/** On a variant branch: the item shape the action emits when this branch is selected. */
	'x-n8n-output'?: JsonSchema;
}

export interface ActionFlow {
	effect: 'read' | 'write' | 'transform';
	cardinality: 'per-item' | '1:N' | 'N:1';
	/** `merge` keeps the input item's fields; `replace` emits only `output`. */
	passthrough: 'replace' | 'merge';
	idempotent?: boolean;
}

export type ContractInput = Record<string, unknown>;

export interface ResourceField {
	name: string;
	value: string | number | boolean;
}

export interface CompiledNode {
	type: string;
	typeVersion: number;
	parameters: Record<string, unknown>;
}

export interface ActionContract {
	id: string;
	node: string;
	action: string;
	/** At most 120 characters. */
	summary: string;
	flow: ActionFlow;
	credentials: readonly string[];
	input: JsonSchema;
	/** Default item shape; a selected variant branch's `x-n8n-output` overrides it. */
	output: JsonSchema;
	/**
	 * Output that depends on parameter values, not only on the selected variant (Set).
	 * `upstream` is the direct parent's output when it is known.
	 */
	deriveOutput?: (input: ContractInput, upstream?: JsonSchema) => JsonSchema;
	/**
	 * A node loadOptions method that lists the resource's fields (Sheet columns, Notion
	 * properties). The build calls it when the credential and resource are known and types the
	 * output from the result. When the call fails, the output stays as derived.
	 */
	resourceSchema?: {
		methodName: string;
		toOutput: (fields: ResourceField[], input: ContractInput, derived: JsonSchema) => JsonSchema;
	};
	/** A valid `parameters` value, shown to the agent as usage. */
	example: ContractInput;
	/** Legacy node this action compiles to. Consumed by the builder, never shown to the agent. */
	compile: {
		type: string;
		typeVersion: number;
		/** Legacy discriminators, used to map a legacy type-definition request to this action. */
		discriminators?: { resource?: string; operation?: string; mode?: string };
		parameters: (input: ContractInput) => Record<string, unknown>;
	};
}
