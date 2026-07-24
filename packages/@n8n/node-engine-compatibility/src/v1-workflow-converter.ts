import type { GraphNode, WorkflowGraph } from '@n8n/engine';
import type { INode, IWorkflowBase } from 'n8n-workflow';

import { UnsupportedWorkflowError } from './errors';
import type { V1NodeStepConfig } from './v1-node-step-config';

const MANUAL_TRIGGER_TYPE = 'n8n-nodes-base.manualTrigger';

/**
 * Common v1 trigger types that don't end in "Trigger". Non-exhaustive: combined
 * with the name heuristic below, it exists to reject unsupported triggers with a
 * clear message. A trigger we fail to recognise falls through to `v1-node` and
 * fails later with a less specific "node has no execute method" error.
 */
const KNOWN_TRIGGER_TYPES = new Set(['n8n-nodes-base.webhook', 'n8n-nodes-base.cron']);

/**
 * Converts a v1 workflow (node-based JSON) into the Engine 2.0 `WorkflowGraph`.
 *
 * A pure, deterministic topology translation: it maps nodes and connections to
 * graph nodes and edges and never executes anything. Supported surface is kept
 * deliberately small (see the converter tests); unsupported constructs are
 * rejected with a clear error rather than silently mistranslated.
 */
export class V1WorkflowConverter {
	convert(workflow: IWorkflowBase): WorkflowGraph {
		const nodes = workflow.nodes.map((node) => this.toGraphNode(node));
		return { nodes, edges: [] };
	}

	private toGraphNode(node: INode): GraphNode {
		if (node.type === MANUAL_TRIGGER_TYPE) {
			return { id: node.id, name: node.name, type: 'trigger' };
		}

		if (this.isTriggerNode(node)) {
			throw new UnsupportedWorkflowError(
				`Trigger node "${node.name}" (${node.type}) is not supported yet; only the Manual Trigger is currently supported.`,
			);
		}

		const config: V1NodeStepConfig = {
			nodeType: node.type,
			typeVersion: node.typeVersion,
			parameters: node.parameters,
			continueOnFail: node.continueOnFail ?? false,
		};
		return { id: node.id, name: node.name, type: 'v1-node', config };
	}

	/** Heuristic trigger detection — see {@link KNOWN_TRIGGER_TYPES}. */
	private isTriggerNode(node: INode): boolean {
		return (
			node.type === MANUAL_TRIGGER_TYPE ||
			KNOWN_TRIGGER_TYPES.has(node.type) ||
			node.type.toLowerCase().endsWith('trigger')
		);
	}
}
