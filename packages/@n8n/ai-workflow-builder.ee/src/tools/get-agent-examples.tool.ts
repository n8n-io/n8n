import type { Logger } from '@n8n/backend-common';

import {
	createGetWorkflowExamplesTool,
	GET_AGENT_EXAMPLES_TOOL,
} from './get-workflow-examples.tool';

export { GET_AGENT_EXAMPLES_TOOL };

/**
 * Factory function to create the get agent examples tool
 * This tool retrieves only AI agent nodes and their connected sub-nodes from workflow examples
 */
export function createGetAgentExamplesTool(logger?: Logger) {
	return createGetWorkflowExamplesTool(logger, { agentsOnly: true });
}
