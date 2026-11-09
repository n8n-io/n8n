import { Service } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';
import type { IDataObject, INodeType, INodeTypes, IVersionedNodeType } from 'n8n-workflow';

/** Thrown when a node type lookup runs before cli registers its node types. */
export class NodeTypesProviderMissingError extends UnexpectedError {
	constructor() {
		super('No node types provider is registered on NodeTypesProxy');
	}
}

/** Looks up the node types that this instance loaded. Throws until a provider is registered. */
@Service()
export class NodeTypesProxy implements INodeTypes {
	private provider: INodeTypes | null = null;

	registerProvider(provider: INodeTypes): void {
		this.provider = provider;
	}

	getByName(nodeType: string): INodeType | IVersionedNodeType {
		return this.getProvider().getByName(nodeType);
	}

	getByNameAndVersion(nodeType: string, version?: number): INodeType {
		return this.getProvider().getByNameAndVersion(nodeType, version);
	}

	getKnownTypes(): IDataObject {
		return this.getProvider().getKnownTypes();
	}

	private getProvider(): INodeTypes {
		if (!this.provider) {
			throw new NodeTypesProviderMissingError();
		}
		return this.provider;
	}
}
