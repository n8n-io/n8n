export type ToolParameter = {
	name: string;
	type: 'infer from description' | 'string' | 'number' | 'boolean';
	description: string;
	required: boolean;
};

export type ParameterInputType = 'keypair' | 'json' | 'model';

export const QUERY_PARAMETERS_PLACEHOLDER = 'urlQueryParameters';
