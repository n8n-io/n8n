import { Service } from '@n8n/di';
import type { INodeType, IVersionedNodeType } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';

interface LoadedClass<T> {
	type: T;
}

interface LoadNodesAndCredentials {
	getNode(fullNodeType: string): LoadedClass<INodeType | IVersionedNodeType>;
}

/**
 * @deprecated Do not use! This class exists only for migration `PurgeInvalidWorkflowConnections`.
 */
@Service()
export class NodeTypesMinimal {
	private loadNodesAndCredentials: LoadNodesAndCredentials;

	getByNameAndVersion(nodeType: string, version?: number): INodeType {
		return NodeHelpers.getVersionedNodeType(
			this.loadNodesAndCredentials.getNode(nodeType).type,
			version,
		);
	}

	setLoadNodesAndCredentials(loadNodesAndCredentials: LoadNodesAndCredentials) {
		this.loadNodesAndCredentials = loadNodesAndCredentials;
	}
}
