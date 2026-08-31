import type { AgentJsonNodeToolConfig, AgentJsonToolConfig, NodeToolConfig } from '@n8n/api-types';
import { getRequiredNodeCredentialSlots } from '@n8n/ai-utilities/node-catalog';
import type { INodeTypeDescription } from 'n8n-workflow';

import type { NodeTypes } from '@/node-types';

import {
	isCredentialDisplayed,
	resolveNodeParameters,
} from './reconcile-node-tool-gateway-credentials';

function isNodeTool(tool: AgentJsonToolConfig): tool is AgentJsonNodeToolConfig {
	return tool.type === 'node';
}

/**
 * Count of a node's required, displayed credential slots that hold a real
 * credential id. A Gateway-credits managed marker does NOT count — auto-unmock
 * fires only when a real credential lands, per product decision.
 */
function countFilledRequiredSlots(
	node: NodeToolConfig,
	description: INodeTypeDescription,
	requiredCredentialTypes: string[],
): { total: number; filled: number } {
	const resolvedParameters = resolveNodeParameters(node, description);
	let total = 0;
	let filled = 0;
	for (const credentialType of requiredCredentialTypes) {
		if (!isCredentialDisplayed(node, description, credentialType, resolvedParameters)) continue;
		total++;
		if (node.credentials?.[credentialType]?.id) filled++;
	}
	return { total, filled };
}

/**
 * Auto-unmock a node tool (AGENT-716) when its required credentials go from
 * entirely empty to entirely filled — catches a real credential landing via
 * the UI, the builder, or `finish_setup` in one place, regardless of which
 * wrote the config. Runs on every config write (mirrors
 * `reconcileNodeToolGatewayCredentials`), comparing the incoming tools against
 * the previously persisted ones so the transition only fires once: a mock the
 * user re-enables afterwards is left alone on later writes because by then the
 * "previous" state is already fully configured too.
 *
 * `items` are kept (cheap re-enable) — only `enabled` flips to `false`.
 */
export function reconcileNodeToolMocks(
	tools: AgentJsonToolConfig[] | undefined,
	previousTools: AgentJsonToolConfig[] | undefined,
	nodeTypes: NodeTypes,
): void {
	if (!tools) return;

	const previousByName = new Map(
		(previousTools ?? []).filter(isNodeTool).map((tool) => [tool.name, tool.node]),
	);

	for (const tool of tools) {
		if (!isNodeTool(tool) || !tool.mock?.enabled) continue;

		let description: INodeTypeDescription;
		try {
			description = nodeTypes.getByNameAndVersion(
				tool.node.nodeType,
				tool.node.nodeTypeVersion,
			).description;
		} catch {
			continue;
		}

		const requiredCredentialTypes = getRequiredNodeCredentialSlots(description).map(
			(slot) => slot.credentialType,
		);
		if (requiredCredentialTypes.length === 0) continue;

		const current = countFilledRequiredSlots(tool.node, description, requiredCredentialTypes);
		if (current.total === 0 || current.filled !== current.total) continue;

		const previousNode = previousByName.get(tool.name);
		const previousFilled = previousNode
			? countFilledRequiredSlots(previousNode, description, requiredCredentialTypes).filled
			: 0;
		// Fires only on the empty -> filled transition; a tool already fully
		// configured before this write is left as the user set it.
		if (previousFilled > 0) continue;

		tool.mock = { ...tool.mock, enabled: false };
	}
}
