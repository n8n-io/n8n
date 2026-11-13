import { z } from 'zod';

/**
 * Types of the compiled workflow engine (proof of concept).
 *
 * A workflow with `settings.engineType: 'compiled'` is converted to the
 * workflow language, compiled to bytecode and run by the `wfrt` runtime. The
 * backend module `compiled-engine` owns this.
 */

/** The value of `settings.engineType` that selects the compiled engine. */
export const COMPILED_ENGINE_TYPE = 'compiled';

/** All values of `settings.engineType`. A workflow without the setting runs on v1. */
export const workflowEngineTypeSchema = z.enum(['v1', 'v2', COMPILED_ENGINE_TYPE]);

export type WorkflowEngineType = z.infer<typeof workflowEngineTypeSchema>;

/**
 * Where a node runs on the compiled engine:
 * - `native`: `wfrt` runs it as a step (triggers, HTTP Request, library nodes,
 *   Wait, Respond to Webhook).
 * - `code`: the node became plain code in the compiled module (IF, Set,
 *   Merge, Filter, ...). It has no step of its own.
 * - `host`: the Node.js fallback host runs it (a v1 node, or the code of a
 *   Code node).
 *
 * A node that cannot run on the compiled engine is not in the map. A
 * diagnostic with severity `error` gives the reason.
 */
export const compiledNodeTierSchema = z.enum(['native', 'code', 'host']);

export type CompiledNodeTier = z.infer<typeof compiledNodeTierSchema>;

export const compiledEngineDiagnosticSeveritySchema = z.enum(['error', 'warning', 'info']);

export type CompiledEngineDiagnosticSeverity = z.infer<
	typeof compiledEngineDiagnosticSeveritySchema
>;

export const compiledEngineDiagnosticSchema = z.object({
	/** The name of the node that the diagnostic is about. Not set for workflow-level diagnostics. */
	node: z.string().optional(),
	severity: compiledEngineDiagnosticSeveritySchema,
	/** A short stable code, for example `unsupported-node` or `expression`. */
	code: z.string(),
	message: z.string(),
	/** The parameter path, when the diagnostic is about one parameter. */
	parameter: z.string().optional(),
});

export type CompiledEngineDiagnostic = z.infer<typeof compiledEngineDiagnosticSchema>;

/**
 * The response of `GET /rest/compiled-engine/workflows/:workflowId/compile`.
 *
 * The endpoint compiles the current (saved) version of the workflow. `ok` is
 * false when a diagnostic has severity `error`; the workflow then cannot run
 * on the compiled engine.
 */
export const compiledEngineCompileResponseSchema = z.object({
	ok: z.boolean(),
	diagnostics: z.array(compiledEngineDiagnosticSchema),
	/** Node name to the place where the node runs. */
	nodes: z.record(z.string(), compiledNodeTierSchema),
	/** The workflow version that was compiled. */
	versionId: z.string().optional(),
	/** ISO 8601 time of the compile. A cached result keeps its first time. */
	compiledAt: z.string().optional(),
});

export type CompiledEngineCompileResponse = z.infer<typeof compiledEngineCompileResponseSchema>;
