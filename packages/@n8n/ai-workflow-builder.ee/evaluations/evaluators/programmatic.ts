import type { INodeTypeDescription } from 'n8n-workflow';

import { evaluateAgentPrompt } from './agent-prompt';
import { evaluateConnections } from './connections';
import { evaluateFromAi } from './fromAi';
import { evaluateTools } from './tools';
import { evaluateTrigger } from './trigger';
import type { EvaluationInput } from '../types/evaluation';
import type { ProgrammaticEvaluationResult } from '../types/test-result';
import { calculateOverallScore } from '../utils/score';

export async function programmaticEvaluation(
	input: EvaluationInput,
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
