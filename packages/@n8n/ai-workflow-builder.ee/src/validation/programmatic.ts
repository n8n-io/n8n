import type { INodeTypeDescription } from 'n8n-workflow';

import {
	validateAgentPrompt,
	validateConnections,
	validateFromAi,
	validateTools,
	validateTrigger,
} from '@/validation/checks';

import type { ProgrammaticChecksResult, ProgrammaticEvaluationInput } from './types';

export function programmaticValidation(
	input: ProgrammaticEvaluationInput,
	nodeTypes: INodeTypeDescription[],
): ProgrammaticChecksResult {
	const { generatedWorkflow } = input;

	const connectionsValidationResult = validateConnections(generatedWorkflow, nodeTypes);
	const triggerValidationResult = validateTrigger(generatedWorkflow, nodeTypes);
	const agentPromptValidationResult = validateAgentPrompt(generatedWorkflow);
	const toolsValidationResult = validateTools(generatedWorkflow, nodeTypes);
	const fromAiValidationResult = validateFromAi(generatedWorkflow, nodeTypes);

	return {
		connections: connectionsValidationResult,
		trigger: triggerValidationResult,
		agentPrompt: agentPromptValidationResult,
		tools: toolsValidationResult,
		fromAi: fromAiValidationResult,
	};
}
