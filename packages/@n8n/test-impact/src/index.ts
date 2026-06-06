/**
 * `@n8n/test-impact` — framework-agnostic Test Impact Analysis core.
 *
 * Phase 1 (ts-morph-free): coverage-map (build + resolve), orchestrator
 * (shard bin-packing), and the V8 selection path. AST-based selection and
 * the Playwright fixture subpath land in later phases.
 */
export * from './coverage-map.js';
export * from './orchestrator.js';
export * from './select-e2e.js';
export type { DiscoveredSpec } from './types.js';
