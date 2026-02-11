import type { INodeTypeDescription } from 'n8n-workflow';

import type { ProgrammaticEvaluationInput, ProgrammaticViolation } from '@/validation/types';

import {
	evaluateConnections,
	evaluateCredentials,
	evaluateGraphValidation,
	evaluateNodes,
	evaluateParameters,
	evaluateTools,
	evaluateAgentPrompt,
	evaluateFromAi,
	evaluateTrigger,
	evaluateNodeUsage,
} from './evaluators';
import {
	evaluateWorkflowSimilarity,
	evaluateWorkflowSimilarityMultiple,
} from './evaluators/workflow-similarity';
import { calculateOverallScore } from './score';

export async function programmaticEvaluation(
	input: ProgrammaticEvaluationInput,
	nodeTypes: INodeTypeDescription[],
) {
	const { generatedWorkflow, referenceWorkflows, generatedCode, preset = 'standard' } = input;

	const connectionsEvaluationResult = evaluateConnections(generatedWorkflow, nodeTypes);
	const nodesEvaluationResult = evaluateNodes(generatedWorkflow, nodeTypes);
	const triggerEvaluationResult = evaluateTrigger(generatedWorkflow, nodeTypes);
	const agentPromptEvaluationResult = evaluateAgentPrompt(generatedWorkflow);
	const toolsEvaluationResult = evaluateTools(generatedWorkflow, nodeTypes);
	const fromAiEvaluationResult = evaluateFromAi(generatedWorkflow, nodeTypes);
	const credentialsEvaluationResult = evaluateCredentials(generatedWorkflow);
	const graphValidationResult = evaluateGraphValidation(generatedCode);
	const nodeUsageEvaluationResult = evaluateNodeUsage(generatedWorkflow);
	const parametersEvaluationResult = evaluateParameters(generatedWorkflow, nodeTypes);

	// Workflow similarity evaluation
	let similarityEvaluationResult = null;

	if (referenceWorkflows && referenceWorkflows.length > 0) {
		try {
			if (referenceWorkflows.length === 1) {
				similarityEvaluationResult = await evaluateWorkflowSimilarity(
					generatedWorkflow,
					referenceWorkflows[0],
					preset,
				);
			} else {
				similarityEvaluationResult = await evaluateWorkflowSimilarityMultiple(
					generatedWorkflow,
					referenceWorkflows,
					preset,
				);
			}
		} catch (error) {
			// Fallback to neutral result if similarity check fails - error captured in violation
			const violation: ProgrammaticViolation = {
				name: 'workflow-similarity-evaluation-failed',
				type: 'critical',
				description: `Similarity evaluation failed: ${(error as Error).message}`,
				pointsDeducted: 0,
			};
			similarityEvaluationResult = {
				violations: [violation],
				score: 0,
			};
		}
	}

	const overallScore = calculateOverallScore({
		connections: connectionsEvaluationResult,
		nodes: nodesEvaluationResult,
		trigger: triggerEvaluationResult,
		agentPrompt: agentPromptEvaluationResult,
		tools: toolsEvaluationResult,
		fromAi: fromAiEvaluationResult,
		credentials: credentialsEvaluationResult,
		nodeUsage: nodeUsageEvaluationResult,
		parameters: parametersEvaluationResult,
		similarity: similarityEvaluationResult,
		graphValidation: graphValidationResult,
	});

	return {
		overallScore,
		connections: connectionsEvaluationResult,
		nodes: nodesEvaluationResult,
		trigger: triggerEvaluationResult,
		agentPrompt: agentPromptEvaluationResult,
		tools: toolsEvaluationResult,
		fromAi: fromAiEvaluationResult,
		credentials: credentialsEvaluationResult,
		nodeUsage: nodeUsageEvaluationResult,
		parameters: parametersEvaluationResult,
		similarity: similarityEvaluationResult,
		graphValidation: graphValidationResult,
	};
}
