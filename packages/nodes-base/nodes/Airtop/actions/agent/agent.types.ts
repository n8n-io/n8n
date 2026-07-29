import type { IDataObject, ResourceMapperField } from 'n8n-workflow';

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
	agent: {
		id: string;
		organizationId: string;
		userId: string;
		name: string;
		enabled: boolean;
	};
	versionData: {
		configVarsSchema?: AirtopAgentSchema;
		resultSchema?: AirtopAgentSchema;
	};
	webhookId: string;
}

export interface AgentsListResponse extends IDataObject {
	agents: Array<AirtopAgentResponse['agent']>;
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
