import type { INode } from 'n8n-workflow';
import {
	addRequirementUsage,
	type AgentRequirementSource,
	type RequirementUsage,
} from '../requirement-source';

/** One workflow's node list, keyed by the id the usage entries should reference. */
export interface WorkflowNodeTypeSource {
	workflowId: string;
	nodes: Array<Pick<INode, 'type' | 'typeVersion'>>;
}

export type NodeTypeSource =
	| WorkflowNodeTypeSource
	| (AgentRequirementSource & { nodes: Array<Pick<INode, 'type' | 'typeVersion'>> });

/** A unique `(type, typeVersion)` pair and the workflows and agents that use it. */
export interface NodeTypeUsage {
	type: string;
	typeVersion: number;
	usedByWorkflows: string[];
	usedByAgents?: string[];
}

/**
 * Collect each `(type, typeVersion)` pair and its users once.
 * Include disabled nodes because their definitions still need the node type.
 */
export function collectNodeTypeUsage(workflows: NodeTypeSource[]): NodeTypeUsage[] {
	const usage = new Map<string, { type: string; typeVersion: number } & RequirementUsage>();

	for (const source of workflows) {
		const { nodes } = source;
		for (const node of nodes) {
			const key = `${node.type}@${node.typeVersion}`;
			const entry = usage.get(key);
			if (entry) {
				addRequirementUsage(entry, source);
				continue;
			}

			const created = {
				type: node.type,
				typeVersion: node.typeVersion,
				usedByWorkflows: [],
			};
			addRequirementUsage(created, source);
			usage.set(key, created);
		}
	}

	return [...usage.values()];
}
