import type { ChangedFile, ResolveResult } from '../coverage-map.js';

/**
 * A selection strategy: given changed files, decide which specs must run.
 *
 * Each strategy resolves *independently* and may return `mode: 'broad'` to mean
 * "I can't scope this — run everything." The {@link selectAffected} pipeline
 * unions scoped results and lets broad win (fail-open). Implementations:
 * `V8MapSelector` (runtime coverage), and — later — an AST selector for
 * test-internal changes and a dep-graph selector for dependency changes.
 */
export interface Selector {
	/** Stable id for logging / telemetry (e.g. 'v8-map', 'ast', 'dep-graph'). */
	readonly name: string;
	resolve(changed: ChangedFile[]): ResolveResult;
}
