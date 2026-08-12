/**
 * In-sandbox harness assets (SYSTEM.md, AGENTS.md, pi extensions), keyed by
 * path relative to the sandbox workspace root. The sandbox bootstrap writes
 * these files before the first harness launch.
 *
 * Populated by the harness-assets workstream; the lifecycle workstream only
 * consumes this map.
 */
export const harnessAssetFiles: Record<string, string> = {};
