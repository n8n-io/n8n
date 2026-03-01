export type ToolParameter = {
	name: string;
	required: boolean;
	type?: string;
	description?: string;
	sendIn: SendIn;
	key?: string;
};

export type PlaceholderDefinition = {
	name: string;
	type?: string;
	description: string;
};

export type ParametersValues = Array<{
	name: string;
	valueProvider: 'modelRequired' | 'modelOptional' | 'fieldValue';
	value?: string;
}>;

export type ParameterInputType = 'keypair' | 'json' | 'model';
export type SendIn = 'body' | 'qs' | 'path' | 'headers';
