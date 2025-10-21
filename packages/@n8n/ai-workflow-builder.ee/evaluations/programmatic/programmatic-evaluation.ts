import type { INodeTypeDescription } from 'n8n-workflow';

import type { ProgrammaticEvaluationInput } from '@/validation/types';

import {
	evaluateConnections,
	evaluateTools,
	evaluateAgentPrompt,
	evaluateFromAi,
	evaluateTrigger,
} from './evaluators';
import { calculateOverallScore } from '../utils/score';

export function programmaticEvaluation(
	input: ProgrammaticEvaluationInput,
	nodeTypes: INodeTypeDescription[],
) {
	const { generatedWorkflow } = input;

	const connectionsEvaluationResult = evaluateConnections(generatedWorkflow, nodeTypes);
	const triggerEvaluationResult = evaluateTrigger(generatedWorkflow, nodeTypes);
	const agentPromptEvaluationResult = evaluateAgentPrompt(generatedWorkflow);
	const toolsEvaluationResult = evaluateTools(generatedWorkflow, nodeTypes);
	const fromAiEvaluationResult = evaluateFromAi(generatedWorkflow, nodeTypes);

	const overallScore = calculateOverallScore({
		connections: connectionsEvaluationResult,
		trigger: triggerEvaluationResult,
		agentPrompt: agentPromptEvaluationResult,
		tools: toolsEvaluationResult,
		fromAi: fromAiEvaluationResult,
	});

	return {
		overallScore,
		connections: connectionsEvaluationResult,
		trigger: triggerEvaluationResult,
		agentPrompt: agentPromptEvaluationResult,
		tools: toolsEvaluationResult,
		fromAi: fromAiEvaluationResult,
	};
}
