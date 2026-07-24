/**
 * Single entry point for everything the editor imports from Vue Flow.
 *
 * All app code imports Vue Flow values and types from this module instead of
 * from `@vue-flow/*` directly. Vue Flow 2.0 (`@xyflow/vue`) ships every built-in
 * from one package — `Background`, `Controls`, `MiniMap`, `NodeResizer` all move
 * out of their standalone packages into core — so routing the imports through
 * here keeps the eventual package swap confined to this file rather than spread
 * across the whole feature.
 */
export * from '@vue-flow/core';

export { Background } from '@vue-flow/background';
export { Controls } from '@vue-flow/controls';
export { MiniMap } from '@vue-flow/minimap';
export { NodeResizer } from '@vue-flow/node-resizer';
export type { OnResize } from '@vue-flow/node-resizer';
