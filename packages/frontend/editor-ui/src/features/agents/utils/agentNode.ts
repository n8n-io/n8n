import { MESSAGE_AN_AGENT_NODE_TYPE } from '@/app/constants/nodeTypes';
import { GRID_SIZE, snapToGrid } from '@/app/utils/nodeViewUtils';

/**
 * Whether the node gets the rich AI Agent experience — the canvas agent card
 * AND the NDV agent controls (builder banner, Agent section, unified Advanced
 * section, trimmed Settings tab). Targets the v2 node; v1 keeps the legacy
 * default rendering and raw NDV layout on every surface.
 */
export function isAgentNodeV2(
	node: { type: string; typeVersion?: number } | null | undefined,
): boolean {
	return node?.type === MESSAGE_AN_AGENT_NODE_TYPE && (node.typeVersion ?? 0) >= 2;
}

// Rendered size of the v2 AI Agent canvas card. CanvasNodeAgent.vue binds its
// width from here; the height is content-driven, so [1] is only a layout
// fallback estimate used before the card has been measured.
export const AGENT_NODE_SIZE: [number, number] = [GRID_SIZE * 20, GRID_SIZE * 8];

/**
 * Offset of the card's main handle from its top. The card is content-sized, so
 * the handle sits on the grid line nearest the center: a card whose top-left is
 * on the grid then has its handle on the grid too, like every fixed-size node.
 * Rounds the integer height Vue Flow measures; the CSS form below must agree.
 */
export function getAgentNodeHandleOffset(height: number): number {
	return snapToGrid(height / 2);
}

/** CSS `top` of the card's main handle `index` of `count`: getAgentNodeHandleOffset in CSS. */
export function getAgentNodeHandleOffsetCss(index: number, count: number): string {
	return `round(round(100%, 1px) * ${index + 1} / ${count + 1}, ${GRID_SIZE}px)`;
}
