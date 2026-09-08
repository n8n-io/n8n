import { NodeOperationError } from 'n8n-workflow';
import { AIRTOP_HOOKS_BASE_URL, BASE_URL_V2, ERROR_MESSAGES } from '../../constants';
import { apiRequest } from '../../transport';
/**
 * Gets the agent input parameters schema.
 */
export async function getAgentDetails(agentId) {
    return await apiRequest.call(this, 'GET', `${BASE_URL_V2}/agents/${agentId}`);
}
/**
 * Validates the agent parameters with the schema.
 */
export function validateAgentParameters(params) {
    const inputParameters = params?.value ?? {};
    const requiredParameters = (params?.schema ?? [])
        .filter((field) => field.required)
        .map((field) => field.id);
    // check for empty values on required fields
    const missingRequiredParameters = requiredParameters.filter((reqParam) => {
        return (inputParameters[reqParam] === undefined ||
            inputParameters[reqParam] === null ||
            inputParameters[reqParam] === '');
    });
    if (missingRequiredParameters.length) {
        throw new NodeOperationError(this.getNode(), `Missing required parameters: ${missingRequiredParameters.join(', ')}`);
    }
    return { configVars: inputParameters };
}
/**
 * Gets the agent status
 */
export async function getAgentStatus(agentId, invocationId) {
    const resultUrl = `${AIRTOP_HOOKS_BASE_URL}/agents/${agentId}/invocations/${invocationId}/result`;
    return await apiRequest.call(this, 'GET', resultUrl);
}
/**
 * Polls the agent execution status until it's completed or fails.
 */
export async function pollAgentStatus(agentId, invocationId, timeoutSeconds) {
    const airtopNode = this.getNode();
    const startTime = Date.now();
    const timeoutMs = timeoutSeconds * 1000;
    let response;
    this.logger.info(`[${airtopNode.name}] Polling agent status for invocationId: ${invocationId}`);
    while (true) {
        const elapsed = Date.now() - startTime;
        throwOperationErrorIf(elapsed >= timeoutMs, ERROR_MESSAGES.TIMEOUT_REACHED, airtopNode);
        response = await getAgentStatus.call(this, agentId, invocationId);
        if (response?.output || response?.error) {
            return response;
        }
        // Wait one second before next poll
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
}
/**
 * Throws an operation error if the statement is true.
 */
export function throwOperationErrorIf(statement, message, node) {
    if (statement) {
        throw new NodeOperationError(node, message);
    }
}
//# sourceMappingURL=agent.utils.js.map