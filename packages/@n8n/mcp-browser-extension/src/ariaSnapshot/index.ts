/**
 * Pure accessibility snapshot pipeline for the Chrome extension.
 *
 * No browser APIs, no Node.js APIs — inputs are plain CDP data objects so this
 * module can be unit-tested on Node.js without a browser.
 *
 * Flow:
 *   buildSnapshot(axNodes, fetchAttributes) → { nodes, refs }
 *   renderSnapshot(nodes)                   → YAML-like text (on demand)
 *   computeSnapshotDiff(prev, next)         → { diffType, content }
 */

export type { AriaProps, DiffResult, SnapshotInput, SnapshotOutput, TreeNode } from './types';
export { buildSnapshot } from './build';
export { renderSnapshot } from './print';
export { computeSnapshotDiff } from './diff';
