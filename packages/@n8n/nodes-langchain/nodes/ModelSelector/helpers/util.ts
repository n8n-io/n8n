import { type INodeOutputConfiguration, type INodeParameters } from 'n8n-workflow';

export const configuredInputs = (parameters: INodeParameters): INodeOutputConfiguration[] => {
	console.log('Calculatin inputs', parameters);
	return Array.from({ length: (parameters.numberInputs as number) || 2 }, (_, i) => ({
		type: 'ai_languageModel',
		required: true,
		displayName: `Model ${(i + 1).toString()}`,
		maxConnections: 1,
	}));
};
