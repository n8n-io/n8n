/**
 * Shared types for LLM mock/pin-data generation.
 *
 * This module is pure: no filesystem, no LLM calls, no clock access. Schema
 * lookup and model invocation are injected by consumers (instance-ai eval,
 * ai-workflow-builder evals, in-product simulated verification).
 */

/** Pin data keyed by node name, items wrapped in n8n's `{ json }` envelope. */
export type PinData = Record<string, Array<Record<string, unknown>>>;

/**
 * Node-type-aware `__schema__` lookup. Structurally identical to n8n-core's
 * `OutputSchemaLookup` — defined here too so this package needs no n8n-core
 * dependency; consumers pass e.g. `LoadNodesAndCredentials.createOutputSchemaLookup()`.
 */
export type OutputSchemaLookup = (node: {
	type: string;
	typeVersion: number;
	resource?: string;
	operation?: string;
	/** Node has an `ai_outputParser` attached — resolves the `with-parser` layout variant. */
	hasOutputParser?: boolean;
}) => Record<string, unknown> | undefined;

/** Structured-output-parser info for an AI root node (Agent/Chain). */
export interface OutputParserContext {
	/** JSON Schema (`manual` mode) or example JSON (`fromJson` mode) from the parser node, when set. */
	schemaText?: string;
	/** True when `schemaText` is an example object rather than a JSON Schema. */
	schemaIsExample: boolean;
}

/** Per-node context assembled for the generation prompt. */
export interface NodeSchemaContext {
	nodeName: string;
	nodeType: string;
	typeVersion: number;
	resource?: string;
	operation?: string;
	schema?: Record<string, unknown>;
	outputParser?: OutputParserContext;
}

export interface PinDataGenerationInstructions {
	dataDescription: string;
	/** Authoritative test-scenario state (e.g. eval dataSetup) — rendered as its own labeled section. */
	testScenario?: string;
}
