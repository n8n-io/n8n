import type { INodeTypeDescription } from 'n8n-workflow';

import {
	validateAgentPrompt,
	validateConnections,
	validateCredentials,
	validateFromAi,
	validateNodes,
	validateTools,
	validateTrigger,
	validateWebhookResponse,
} from '@/validation/checks';

import type { ProgrammaticChecksResult, ProgrammaticEvaluationInput } from './types';

export function programmaticValidation(
	input: ProgrammaticEvaluationInput,
	nodeTypes: INodeTypeDescription[],
): ProgrammaticChecksResult {
	const { generatedWorkflow } = input;

	const connectionsValidationResult = validateConnections(generatedWorkflow, nodeTypes);
	const nodesValidationResult = validateNodes(generatedWorkflow, nodeTypes);
	const triggerValidationResult = validateTrigger(generatedWorkflow, nodeTypes);
	const agentPromptValidationResult = validateAgentPrompt(generatedWorkflow);
	const toolsValidationResult = validateTools(generatedWorkflow, nodeTypes);
	const fromAiValidationResult = validateFromAi(generatedWorkflow, nodeTypes);
	const credentialsValidationResult = validateCredentials(generatedWorkflow);
	const nodeUsageValidationResult = validateWebhookResponse(generatedWorkflow);

	return {
		connections: connectionsValidationResult,
		nodes: nodesValidationResult,
		trigger: triggerValidationResult,
		agentPrompt: agentPromptValidationResult,
		tools: toolsValidationResult,
		fromAi: fromAiValidationResult,
		credentials: credentialsValidationResult,
		nodeUsage: nodeUsageValidationResult,
	};
}
