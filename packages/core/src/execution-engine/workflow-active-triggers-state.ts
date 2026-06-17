import type { ITriggerResponse } from 'n8n-workflow';

/**
 * Holds the activated trigger responses for a single workflow, keyed by node id.
 * One entry per activated trigger node.
 */
export class WorkflowActiveTriggersState {
	private readonly triggersByNodeId = new Map<string, ITriggerResponse>();

	/** Records the trigger response produced when activating a trigger node. */
	add(nodeId: string, response: ITriggerResponse) {
		this.triggersByNodeId.set(nodeId, response);
	}

	/** The trigger response recorded for a node, if any. */
	get(nodeId: string) {
		return this.triggersByNodeId.get(nodeId);
	}

	/** Whether a trigger response has been recorded for the given node. */
	has(nodeId: string) {
		return this.triggersByNodeId.has(nodeId);
	}

	/** Drops the trigger response recorded for a node. */
	delete(nodeId: string) {
		this.triggersByNodeId.delete(nodeId);
	}

	/** Whether no trigger responses have been recorded yet. */
	get isEmpty() {
		return this.triggersByNodeId.size === 0;
	}

	/** Ids of the nodes that have a recorded trigger response. */
	get nodeIds(): IterableIterator<string> {
		return this.triggersByNodeId.keys();
	}

	/** All recorded trigger responses, in insertion order. */
	get triggerResponses(): IterableIterator<ITriggerResponse> {
		return this.triggersByNodeId.values();
	}
}
