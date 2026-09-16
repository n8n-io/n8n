import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { PreparedVerificationRun } from './prepare-run';
import { itemsForNode } from '../../../utils/node-keyed-items';
import type { NodeSimulationVerdict } from '../../../workflow-loop/workflow-loop-state';
import {
	AGENT_NODE_TYPE,
	AGENT_TOOL_NODE_TYPE,
	createVerificationGraph,
	getTriggerMainFlowScope,
} from '../../workflows/verification-graph';

export interface ToolSimulationBlocker {
	reason: string;
	guidance: string;
	nodesNotReached?: string[];
}

const GRAPH_UNAVAILABLE: ToolSimulationBlocker = {
	reason: 'verification_graph_unavailable',
	guidance:
		'Verification was not run because the current workflow graph could not be inspected. Read the workflow and retry verification.',
};

/** Check every caller path before verification can run a tool. */
export function checkToolSimulationSupport(args: {
	workflow: WorkflowJSON | undefined;
	workflowPinnedNodeNames?: string[];
	plan: NodeSimulationVerdict[];
	prepared: PreparedVerificationRun;
	triggerNodeName?: string;
}): ToolSimulationBlocker | undefined {
	const { workflow, plan, prepared, triggerNodeName } = args;
	if (!workflow || !Array.isArray(workflow.nodes)) {
		return GRAPH_UNAVAILABLE;
	}
	let graph: ReturnType<typeof createVerificationGraph>;
	let mainScope: Set<string>;
	let scope: Set<string>;
	try {
		graph = createVerificationGraph(workflow);
		mainScope = triggerNodeName
			? getTriggerMainFlowScope(workflow.connections, triggerNodeName)
			: graph.rootNodeNames;
		scope = graph.withTools(mainScope);
	} catch {
		return GRAPH_UNAVAILABLE;
	}
	const verdicts = new Map(plan.map((verdict) => [verdict.nodeName, verdict]));
	const missing = new Set(
		[...scope].flatMap((name) => graph.toolsFor(name)).filter((name) => !verdicts.has(name)),
	);
	if (missing.size > 0) {
		return {
			reason: 'incomplete_tool_simulation_plan',
			guidance: `Verification was not run because attached tools have no classification: ${[...missing].join(', ')}. Resubmit the workflow to classify these tools before verification.`,
			nodesNotReached: [...scope],
		};
	}
	const unsupported = new Set<string>();
	const workflowPinnedNodeNames = new Set(args.workflowPinnedNodeNames);
	const visited = new Set<string>();
	const pending: Array<{ name: string; scheduled: boolean; caller?: string }> = [...mainScope].map(
		(name) => ({ name, scheduled: true }),
	);
	while (pending.length > 0) {
		const { name, scheduled, caller } = pending.pop()!;
		const node = graph.nodesByName.get(name);
		if (!node) continue;
		const verdict = verdicts.get(name);
		const pinned =
			workflowPinnedNodeNames.has(name) ||
			itemsForNode(prepared.verificationPinData, name) !== undefined ||
			itemsForNode(workflow.pinData, name) !== undefined;
		if (caller !== undefined) {
			// An unset order is also legacy. The engine can resume the Agent before its tool result.
			const legacyOrder = workflow.settings?.executionOrder !== 'v1';
			if ((!scheduled || legacyOrder) && (verdict?.verdict === 'simulate' || pinned)) {
				unsupported.add(
					`${name} (called by ${caller}${legacyOrder ? '; legacy execution order' : ''})`,
				);
			}
		}
		// Inline calls do not read pin data. Only an engine-scheduled pin skips children.
		if (scheduled && pinned) continue;
		const state = JSON.stringify([name, scheduled, caller === undefined]);
		if (visited.has(state)) continue;
		visited.add(state);
		const supportsTools =
			scheduled &&
			node.typeVersion >= 3 &&
			(caller === undefined ? node.type === AGENT_NODE_TYPE : node.type === AGENT_TOOL_NODE_TYPE);
		for (const tool of graph.toolsFor(name)) {
			pending.push({ name: tool, scheduled: supportsTools, caller: name });
		}
	}
	if (unsupported.size > 0) {
		return {
			reason: 'unsupported_tool_simulation',
			guidance: `Verification was not run because these tools need simulation on an unsupported execution path: ${[...unsupported].join('; ')}. Report these tools as unverified. Keep the Agent versions unchanged.`,
			nodesNotReached: [...scope],
		};
	}
	return undefined;
}
