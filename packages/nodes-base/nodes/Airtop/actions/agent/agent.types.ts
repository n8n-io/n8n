import { IDataObject, ResourceMapperField } from 'n8n-workflow';

export interface AgentSchemaProperty {
	description?: string;
	type: string;
	default?: unknown;
}

export interface AirtopAgentSchema {
	$schema?: string;
	additionalProperties?: boolean;
	properties?: Record<string, AgentSchemaProperty>;
	required?: string[];
	type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
}

export interface AirtopAgentResponse extends IDataObject {
	id: string;
	name: string;
	enabled: boolean;
	publishedVersion: number;
	webhookId: string;
	versionData: {
		configVarsSchema?: AirtopAgentSchema;
		resultSchema?: AirtopAgentSchema;
	};
}

export interface AgentsListResponse extends IDataObject {
	agents: Array<Pick<AirtopAgentResponse, 'id' | 'name' | 'enabled'>>;
}

export interface AgentParametersInput {
	value?: IDataObject;
	schema: ResourceMapperField[];
}

export interface AgentInvocationResponse extends IDataObject {
	invocationId: string;
}

export interface AgentResultResponse extends IDataObject {
	status: 'Completed' | 'Running' | 'Failed' | 'Unknown';
	output?: IDataObject;
	error?: string;
}
