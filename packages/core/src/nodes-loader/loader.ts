import type {
	ICredentialType,
	ICredentialTypeData,
	INodeType,
	INodeTypeData,
	INodeTypeDescription,
	IVersionedNodeType,
	KnownNodesAndCredentials,
	LoadedClass,
} from 'n8n-workflow';

export type Types = {
	nodes: INodeTypeDescription[];
	credentials: ICredentialType[];
};

export interface ILoader {
	directory?: string;
	packageName: string;
	isLazyLoaded: boolean;
	known: KnownNodesAndCredentials;
	types: Types;
	nodeTypes: INodeTypeData;
	credentialTypes: ICredentialTypeData;
	loadAll(): Promise<void>;
	reset(): void;
	getNode(nodeType: string): LoadedClass<INodeType | IVersionedNodeType>;
	getCredential(credentialType: string): LoadedClass<ICredentialType>;
}
