import {
	checkEngineV2Eligibility,
	type EngineV2Eligibility,
	type EngineV2EligibilityWorkflow,
	type EngineV2Reason,
	type EngineV2ReasonCode,
} from '@n8n/workflow-engine-check';

/*
 * The only file that imports `@n8n/workflow-engine-check`. The rest of the module uses the
 * names below, so a change to the package contract changes this file only.
 */

export type EngineCompatibilityWorkflow = EngineV2EligibilityWorkflow;
export type EngineCompatibilityReason = EngineV2Reason;
export type EngineCompatibility = EngineV2Eligibility;

/**
 * The codes that the package gives for a node type, wherever the node is in the workflow
 * (`node-type-rule.ts` in the package). When the package adds a node-type code, add it here.
 * A code that is missing here makes its node types show as supported in the node creator.
 * The workflow check still reports them on the canvas.
 */
const NODE_TYPE_REASON_CODES: ReadonlySet<EngineV2ReasonCode> = new Set<EngineV2ReasonCode>([
	'AI_NODE',
	'CHAT_NODE',
	'COMMUNITY_NODE',
	'EVALUATION_NODE',
	'EXECUTION_DATA_NODE',
	'FORM_NODE',
	'MCP_SERVER_TRIGGER',
	'MESSAGE_AN_AGENT_NODE',
	'MICROSOFT_AGENT365_TRIGGER',
	'TIME_SAVED_NODE',
	'TRIGGER_WAITS_FOR_RUN',
]);

// The answer depends only on the type, and the node creator asks for every row.
const nodeTypeSupport = new Map<string, boolean>();

/** The package has no node-type function, so check a workflow that holds only that node. */
function checkNodeType(nodeTypeName: string): boolean {
	const { reasons } = checkEngineV2Eligibility({
		nodes: [
			{
				id: 'node-type-probe',
				name: 'Node type probe',
				type: nodeTypeName,
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
		],
		connections: {},
		settings: {},
	});
	return !reasons.some((reason) => NODE_TYPE_REASON_CODES.has(reason.code));
}

/**
 * The module calls the check through this object, so that tests can replace a method with
 * `mockEngineV2Compatibility` from `./__tests__/mocks`.
 */
export const engineV2Check = {
	checkWorkflow(workflow: EngineCompatibilityWorkflow): EngineCompatibility {
		return checkEngineV2Eligibility(workflow);
	},

	isNodeTypeSupported(nodeTypeName: string): boolean {
		let supported = nodeTypeSupport.get(nodeTypeName);
		if (supported === undefined) {
			supported = checkNodeType(nodeTypeName);
			nodeTypeSupport.set(nodeTypeName, supported);
		}
		return supported;
	},
};
