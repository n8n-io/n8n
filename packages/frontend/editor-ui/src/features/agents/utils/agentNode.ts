import { MESSAGE_AN_AGENT_NODE_TYPE } from '@/app/constants/nodeTypes';

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
