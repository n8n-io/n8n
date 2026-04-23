import type { InstanceAiEvalExecutionResult } from '@n8n/api-types';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

/**
 * POST /instance-ai/eval/execute-with-llm-mock/:workflowId
 * Runs the workflow once with HTTP calls intercepted by an LLM-based mock handler,
 * guided by an optional scenario description. Returns a per-node execution trace
 * with intercepted requests and mock responses.
 */
export async function executeWithScenario(
	context: IRestApiContext,
	workflowId: string,
	scenarioHints?: string,
): Promise<InstanceAiEvalExecutionResult> {
	const body = scenarioHints ? { scenarioHints } : {};
	return await makeRestApiRequest<InstanceAiEvalExecutionResult>(
		context,
		'POST',
		`/instance-ai/eval/execute-with-llm-mock/${workflowId}`,
		body,
	);
}
