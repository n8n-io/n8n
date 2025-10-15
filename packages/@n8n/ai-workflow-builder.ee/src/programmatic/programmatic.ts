import type { INodeTypeDescription } from 'n8n-workflow';

import {
	evaluateAgentPrompt,
	evaluateConnections,
	evaluateFromAi,
	evaluateTools,
	evaluateTrigger,
} from './evaluators';
import type { ProgrammaticEvaluationInput, ProgrammaticEvaluationResult } from './types';
import { calculateOverallScore } from './utils/score';

export async function programmaticEvaluation(
	input: ProgrammaticEvaluationInput,
	nodeTypes: INodeTypeDescription[],
): Promise<ProgrammaticEvaluationResult> {
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
