import type { INodeParameters } from 'n8n-workflow';

/**
 * Whitelist of parameter names that commonly affect node connections
 * These parameters often control which inputs/outputs are available
 */
export const CONNECTION_AFFECTING_PARAMETERS = new Set([
	'mode',
	'operation',
	'resource',
	'action',
	'method',
	'textSplittingMode',
	'useReranker',
	'outputFormat',
	'inputType',
	'outputType',
	'connectionMode',
	'dataType',
	'triggerMode',
]);

/**
 * Validate that the provided parameters only contain connection-affecting parameters
 * @param parameters - The parameters to validate
 * @returns Object with validation result and filtered parameters
 */
export function validateConnectionParameters(parameters: INodeParameters): {
	valid: boolean;
	filtered: INodeParameters;
	warnings: string[];
} {
	const filtered: INodeParameters = {};
	const warnings: string[] = [];

	for (const [key, value] of Object.entries(parameters)) {
		if (CONNECTION_AFFECTING_PARAMETERS.has(key)) {
			filtered[key] = value;
		} else {
			warnings.push(
				`Parameter "${key}" is not a connection-affecting parameter and will be ignored`,
			);
		}
	}

	return {
		valid: Object.keys(filtered).length > 0,
		filtered,
		warnings,
	};
}

/**
 * Extract only connection-affecting parameters from a node's current parameters
 * @param parameters - The node's full parameters
 * @returns Only the connection-affecting parameters
 */
export function extractConnectionParameters(parameters: INodeParameters): INodeParameters {
	const connectionParams: INodeParameters = {};

	for (const [key, value] of Object.entries(parameters)) {
		if (CONNECTION_AFFECTING_PARAMETERS.has(key)) {
			connectionParams[key] = value;
		}
	}

	return connectionParams;
}
