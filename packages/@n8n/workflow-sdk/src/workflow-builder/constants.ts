/**
 * Layout constants for workflow builder
 *
 * These match the frontend's canvas layout constants to ensure
 * SDK-generated positions match what the FE tidy-up would produce.
 */

export const GRID_SIZE = 16;

// Node dimensions (defaults — can be refined with node type descriptions later)
export const DEFAULT_NODE_SIZE: [number, number] = [GRID_SIZE * 6, GRID_SIZE * 6]; // 96x96
export const CONFIGURATION_NODE_RADIUS = (GRID_SIZE * 5) / 2; // 40
export const CONFIGURATION_NODE_SIZE: [number, number] = [
	CONFIGURATION_NODE_RADIUS * 2,
	CONFIGURATION_NODE_RADIUS * 2,
]; // 80x80
export const CONFIGURABLE_NODE_SIZE: [number, number] = [GRID_SIZE * 16, GRID_SIZE * 6]; // 256x96
export const NODE_MIN_INPUT_ITEMS_COUNT = 4;

// Layout spacing (matching FE useCanvasLayout)
export const NODE_X_SPACING = GRID_SIZE * 8; // 128
export const NODE_Y_SPACING = GRID_SIZE * 6; // 96
export const SUBGRAPH_SPACING = GRID_SIZE * 8; // 128
export const AI_X_SPACING = GRID_SIZE * 3; // 48
export const AI_Y_SPACING = GRID_SIZE * 8; // 128
export const STICKY_BOTTOM_PADDING = GRID_SIZE * 4; // 64

export const STICKY_NODE_TYPE = 'n8n-nodes-base.stickyNote';

// BFS layout constants (used by calculateNodePositions for basic positioning)
export const NODE_SPACING_X = 200;
export const DEFAULT_Y = 300;
export const START_X = 100;
