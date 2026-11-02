import { Service } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';
import type { IDataObject, INodeType, INodeTypes, IVersionedNodeType } from 'n8n-workflow';

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
			throw new UnexpectedError('No node types provider is registered on NodeTypesProxy');
		}
		return this.provider;
	}
}
