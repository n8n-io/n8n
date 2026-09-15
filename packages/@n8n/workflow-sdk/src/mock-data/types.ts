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

/** A real Data Table column, passed in by consumers with instance access. */
export interface DataTableColumnInfo {
	name: string;
	type: string;
}

/**
 * The authoritative field-name contract for a pinned node's items, when one
 * exists: an information extractor's declared attributes, a structured output
 * parser's schema keys, or a Data Table's real columns. Generated pin data is
 * validated against it — drifted names (`invoice_amount` where the schema says
 * `total_amount`) are the top residual mock-quality defect in eval runs.
 */
export interface DeclaredFieldContract {
	/** The declared field names. */
	keys: string[];
	/** Envelope key the fields live under (e.g. `output` for extractor roots); absent = top-level `json`. */
	envelopeKey?: string;
	/** True when items must carry exactly `keys` (Data Table rows); false allows a subset (optional schema fields). */
	exact: boolean;
	source: 'declared-schema' | 'data-table-columns';
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
	/** Real Data Table columns for dataTable reads — rendered in the prompt as the authoritative row shape. */
	dataTableColumns?: DataTableColumnInfo[];
	declaredFields?: DeclaredFieldContract;
}

export interface PinDataGenerationInstructions {
	dataDescription: string;
	/** Authoritative test-scenario state (e.g. eval dataSetup) — rendered as its own labeled section. */
	testScenario?: string;
}
