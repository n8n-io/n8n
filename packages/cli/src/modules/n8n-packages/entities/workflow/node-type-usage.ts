import type { INode } from 'n8n-workflow';

import type { PackageNodeTypeRequirement } from '../../spec/requirements.schema';
import { addRequirementUsage, type RequirementSource } from '../requirement-source';

export type NodeTypeSource = RequirementSource & {
	nodes: Array<Pick<INode, 'type' | 'typeVersion'>>;
};

/** A unique node type/version pair and its package consumers. */
export type NodeTypeUsage = PackageNodeTypeRequirement;

/**
 * Include disabled nodes because they remain part of the authored definition.
 * Collect usage without node registry lookups.
 */
export function collectNodeTypeUsage(sources: NodeTypeSource[]): NodeTypeUsage[] {
	const usage = new Map<string, NodeTypeUsage>();

	for (const source of sources) {
		for (const node of source.nodes) {
			const key = `${node.type}@${node.typeVersion}`;
			const entry = usage.get(key) ?? {
				type: node.type,
				typeVersion: node.typeVersion,
				usedBy: [],
			};
			addRequirementUsage(entry, source);
			usage.set(key, entry);
		}
	}

	return [...usage.values()];
}
