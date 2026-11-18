import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { IConnections, INode } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';

import { NodeTypes } from '@/node-types';

export interface WorkflowDefinition {
	nodes: INode[];
	connections: IConnections;
}

export interface WorkflowDefinitions {
	workflowId: string;
	draftVersionId: string;
	activeVersionId: string | null;
	draft: WorkflowDefinition;
	/** The published version, or null when the workflow is not published. */
	active: WorkflowDefinition | null;
}

/**
 * Gives a workflow definition in one form, whoever saved it.
 *
 * The editor drops every parameter that equals its default when it saves, and a script that
 * creates a workflow through the API may spell the defaults out. Both describe the same
 * workflow. A grant must not break when the editor saves it, so the resolver and the person who
 * approves a workflow reduce parameters to the same non-default form before they hash.
 */
@Service()
export class VaultWorkflowDefinitionService {
	constructor(
		private readonly nodeTypes: NodeTypes,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	normalize({ nodes, connections }: WorkflowDefinition): WorkflowDefinition {
		return { nodes: nodes.map((node) => this.normalizeNode(node)), connections };
	}

	async load(workflowId: string): Promise<WorkflowDefinitions | null> {
		const workflow = await this.workflowRepository.findById(workflowId);
		if (!workflow) return null;
		const { activeVersion } = workflow;
		return {
			workflowId,
			draftVersionId: workflow.versionId,
			activeVersionId: activeVersion?.versionId ?? null,
			draft: this.normalize({ nodes: workflow.nodes, connections: workflow.connections }),
			active: activeVersion
				? this.normalize({ nodes: activeVersion.nodes, connections: activeVersion.connections })
				: null,
		};
	}

	private normalizeNode(node: INode): INode {
		let description;
		try {
			description = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion).description;
		} catch {
			// A node type that is not installed keeps the parameters as they are stored.
			return node;
		}
		const parameters = NodeHelpers.getNodeParameters(
			description.properties,
			node.parameters,
			false,
			false,
			node,
			description,
		);
		return { ...node, parameters: parameters ?? {} };
	}
}
