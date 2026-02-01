import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';

import type { IAirtopNodeExecutionData, IAirtopResponse } from '../../transport/types';

/**
 * Parse JSON when the 'Parse JSON Output' parameter is enabled
 * @param this - The execution context
 * @param index - The index of the node
 * @param response - The Airtop API response to parse
 * @returns The parsed output
 */
export function parseJsonIfPresent(
	this: IExecuteFunctions,
	index: number,
	response: IAirtopResponse,
): IAirtopResponse {
	const parseJsonOutput = this.getNodeParameter('additionalFields.parseJsonOutput', index, false);
	const outputJsonSchema = this.getNodeParameter(
		'additionalFields.outputSchema',
		index,
		'',
	) as string;

	if (!parseJsonOutput || !outputJsonSchema.startsWith('{')) {
		return response;
	}

	try {
		const output = JSON.parse(response.data?.modelResponse ?? '') as IDataObject;
		return {
			sessionId: response.sessionId,
			windowId: response.windowId,
			output,
		};
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Output is not a valid JSON');
	}
}

/**
 * Clean up the output when used as a tool
 * @param output - The output to clean up
 * @returns The cleaned up output
 */
export function cleanOutputForToolUse(output: IAirtopNodeExecutionData[]) {
	const getOutput = (executionData: IAirtopNodeExecutionData) => {
		// Return error message
		if (executionData.json?.errors?.length) {
			const errorMessage = executionData.json?.errors[0].message as string;
			return {
				output: `Error: ${errorMessage}`,
			};
		}

		// Return output parsed from JSON
		if (executionData.json?.output) {
			return executionData.json?.output;
		}

		// Return model response
		if (executionData.json?.data?.modelResponse) {
			return {
				output: executionData.json?.data?.modelResponse,
			};
		}

		// Return everything else
		return {
			output: { ...(executionData.json?.data ?? {}) },
		};
	};

	return output.map((executionData) => ({
		...executionData,
		json: {
			...getOutput(executionData),
		},
	}));
}
