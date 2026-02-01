import { Service } from '@n8n/di';
import { NodeHelpers } from 'n8n-workflow';
import type { INodeType, INodeTypes, IVersionedNodeType } from 'n8n-workflow';

import { LoadNodesAndCredentials } from './load-nodes-and-credentials';

@Service()
export class NodeTypes implements INodeTypes {
	constructor(private readonly loadNodesAndCredentials: LoadNodesAndCredentials) {}

	getByName(type: string): INodeType | IVersionedNodeType {
		return this.loadNodesAndCredentials.getNode(type).type;
	}

	getByNameAndVersion(type: string, version?: number): INodeType {
		const node = this.loadNodesAndCredentials.getNode(type);
		return NodeHelpers.getVersionedNodeType(node.type, version);
	}

	getKnownTypes() {
		return this.loadNodesAndCredentials.known.nodes;
	}
}
