import type { INodeTypeDescription } from 'n8n-workflow';

import type { ProgrammaticEvaluationInput, ProgrammaticViolation } from '@/validation/types';

import {
	evaluateConnections,
	evaluateCredentials,
	evaluateNodes,
	evaluateTools,
	evaluateAgentPrompt,
	evaluateFromAi,
	evaluateTrigger,
} from './evaluators';
import {
	evaluateWorkflowSimilarity,
	evaluateWorkflowSimilarityMultiple,
} from './evaluators/workflow-similarity';
import { calculateOverallScore } from '../utils/score';

export async function programmaticEvaluation(
	input: ProgrammaticEvaluationInput,
	nodeTypes: INodeTypeDescription[],
) {
	const { generatedWorkflow, referenceWorkflow, referenceWorkflows } = input;

	const connectionsEvaluationResult = evaluateConnections(generatedWorkflow, nodeTypes);
	const nodesEvaluationResult = evaluateNodes(generatedWorkflow, nodeTypes);
	const triggerEvaluationResult = evaluateTrigger(generatedWorkflow, nodeTypes);
	const agentPromptEvaluationResult = evaluateAgentPrompt(generatedWorkflow);
	const toolsEvaluationResult = evaluateTools(generatedWorkflow, nodeTypes);
	const fromAiEvaluationResult = evaluateFromAi(generatedWorkflow, nodeTypes);
	const credentialsEvaluationResult = evaluateCredentials(generatedWorkflow);

	// Workflow similarity evaluation (supports both single and multiple reference workflows)
	let similarityEvaluationResult = null;

	// Prioritize referenceWorkflows (multiple) over referenceWorkflow (single)
	if (referenceWorkflows && referenceWorkflows.length > 0) {
		try {
			similarityEvaluationResult = await evaluateWorkflowSimilarityMultiple(
				generatedWorkflow,
				referenceWorkflows,
			);
		} catch (error) {
			console.warn('Multiple workflow similarity evaluation failed:', error);
			// Fallback to neutral result if similarity check fails
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
	} else if (referenceWorkflow) {
		try {
			similarityEvaluationResult = await evaluateWorkflowSimilarity(
				generatedWorkflow,
				referenceWorkflow,
			);
		} catch (error) {
			console.warn('Workflow similarity evaluation failed:', error);
			// Fallback to neutral result if similarity check fails
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
		similarity: similarityEvaluationResult,
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
		similarity: similarityEvaluationResult,
	};
}
