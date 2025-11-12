/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import type { NodeConnectionType } from 'n8n-workflow';

import { WorkflowNode } from './nodes';
import type { NodeType } from './nodeTypes';
import type { Workflow } from './workflow';

export class ConnectionBuilder<
	Source extends NodeType | unknown = unknown,
	Target extends NodeType | unknown = unknown,
> {
	private source?: {
		node: WorkflowNode<Source>;
		type: NodeConnectionType;
		index: number;
	};

	constructor(private workflow: Workflow) {}

	/**
	 * Set the source node
	 */
	from(
		source:
			| WorkflowNode<Source>
			| { node: WorkflowNode<Source>; type?: NodeConnectionType; index?: number },
	): this {
		if (source instanceof WorkflowNode) {
			this.source = {
				node: source,
				type: 'main',
				index: 0,
			};
		} else {
			this.source = {
				node: source.node,
				type: source.type ?? 'main',
				index: source.index ?? 0,
			};
		}

		return this;
	}

	/**
	 * Add destination nodes and create connections immediately
	 */
	to(
		destinations:
			| WorkflowNode<Target>
			| Array<WorkflowNode<Target>>
			| { node: WorkflowNode<Target>; type?: NodeConnectionType; index?: number },
	): this {
		if (!this.source) {
			throw new Error('Source node not set. Use .from() to set the source node.');
		}

		const destNodes: Array<{
			node: WorkflowNode<Target>;
			type: NodeConnectionType;
			index: number;
		}> = [];

		if (Array.isArray(destinations)) {
			for (const dest of destinations) {
				destNodes.push({
					node: dest,
					type: 'main',
					index: 0,
				});
			}
		} else if (destinations instanceof WorkflowNode) {
			destNodes.push({
				node: destinations,
				type: 'main',
				index: 0,
			});
		} else {
			destNodes.push({
				node: destinations.node,
				type: destinations.type ?? 'main',
				index: destinations.index ?? 0,
			});
		}

		// Add connections immediately
		for (const dest of destNodes) {
			this.workflow.addConnection(
				this.source.node,
				dest.node,
				this.source.type,
				this.source.index,
				dest.type,
				dest.index,
			);
		}

		return this;
	}
}
