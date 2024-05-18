export type ToolParameter = {
	name: string;
	required: boolean;
	type?: string;
	description?: string;
};

export type ParametersValues = Array<{
	name: string;
	valueProvider: 'modelRequired' | 'modelOptional' | 'fieldValue';
	value: string;
}>;

export type ParameterInputType = 'keypair' | 'json' | 'model';

export const QUERY_PARAMETERS_PLACEHOLDER = 'queryParameters';
export const HEADERS_PARAMETERS_PLACEHOLDER = 'headersParameters';
export const BODY_PARAMETERS_PLACEHOLDER = 'bodyParameters';
