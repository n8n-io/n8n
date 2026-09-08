import { NodeOperationError } from 'n8n-workflow';
/**
 * Parse JSON when the 'Parse JSON Output' parameter is enabled
 * @param this - The execution context
 * @param index - The index of the node
 * @param response - The Airtop API response to parse
 * @returns The parsed output
 */
export function parseJsonIfPresent(index, response) {
    const parseJsonOutput = this.getNodeParameter('additionalFields.parseJsonOutput', index, false);
    const outputJsonSchema = this.getNodeParameter('additionalFields.outputSchema', index, '');
    if (!parseJsonOutput || !outputJsonSchema.startsWith('{')) {
        return response;
    }
    try {
        const output = JSON.parse(response.data?.modelResponse ?? '');
        return {
            sessionId: response.sessionId,
            windowId: response.windowId,
            output,
        };
    }
    catch (error) {
        throw new NodeOperationError(this.getNode(), 'Output is not a valid JSON');
    }
}
/**
 * Clean up the output when used as a tool
 * @param output - The output to clean up
 * @returns The cleaned up output
 */
export function cleanOutputForToolUse(output) {
    const getOutput = (executionData) => {
        // Return error message
        if (executionData.json?.errors?.length) {
            const errorMessage = executionData.json?.errors[0].message;
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
//# sourceMappingURL=output.utils.js.map