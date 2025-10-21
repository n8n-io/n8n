import { INodeTypeDescription } from 'n8n-workflow';
import { validateAgentPrompt } from '@/programmatic/evaluators/agent-prompt';
import { validateConnections } from '@/programmatic/evaluators/connections';
import { validateFromAi } from '@/programmatic/evaluators/from-ai';
import { validateTools } from '@/programmatic/evaluators/tools';
import { validateTrigger } from '@/programmatic/evaluators/trigger';

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
