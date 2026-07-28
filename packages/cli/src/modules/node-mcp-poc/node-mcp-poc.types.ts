import type { INodeCredentialsDetails, INodeParameters } from 'n8n-workflow';

export type NodeMcpPocEndpointType = 'json-schema' | 'action-lookup';

export interface NodeMcpPocBinding {
	nodeType: string;
	nodeVersion: number;
	projectId: string;
	userId: string;
	credentials: Record<string, INodeCredentialsDetails>;
	fixedParameters?: INodeParameters;
}

interface NodeMcpPocEndpointBase {
	endpoint: string;
	binding: NodeMcpPocBinding;
}

export type ResolverFlavor = 'per-parameter' | 'generic-single' | 'generic-batch';

export interface JsonSchemaNodeMcpPocFlavor {
	resolver: ResolverFlavor;
	hideOptions: boolean;
	allowTools?: readonly string[];
	denyTools?: readonly string[];
	allowDestructive?: boolean;
}

export interface JsonSchemaNodeMcpPocEndpoint extends NodeMcpPocEndpointBase {
	type: 'json-schema';
	flavor: JsonSchemaNodeMcpPocFlavor;
}

export interface ActionLookupNodeMcpPocPolicy {
	allowActions?: readonly string[];
	denyActions?: readonly string[];
	allowDestructive?: boolean;
}

export interface ActionLookupNodeMcpPocEndpoint {
	endpoint: string;
	type: 'action-lookup';
	bindings: readonly NodeMcpPocBinding[];
	policy?: ActionLookupNodeMcpPocPolicy;
}

export type NodeMcpPocEndpoint = JsonSchemaNodeMcpPocEndpoint | ActionLookupNodeMcpPocEndpoint;
