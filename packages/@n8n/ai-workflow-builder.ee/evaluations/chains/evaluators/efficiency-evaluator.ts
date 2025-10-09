import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { z } from 'zod';

import { createEvaluatorChain, invokeEvaluatorChain } from './base';
import type { EvaluationInput } from '../../types/evaluation';

// Schema for efficiency evaluation result
const efficiencyResultSchema = z.object({
	score: z.number().min(0).max(1),
	violations: z.array(
		z.object({
			type: z.enum(['critical', 'major', 'minor']),
			description: z.string(),
			pointsDeducted: z.number().min(0),
		}),
	),
	redundancyScore: z.number().min(0).max(1).describe('Score for avoiding redundant operations'),
	pathOptimization: z.number().min(0).max(1).describe('Score for optimal execution paths'),
	nodeCountEfficiency: z.number().min(0).max(1).describe('Score for using minimal nodes'),
	analysis: z.string().describe('Brief analysis of workflow efficiency'),
});

export type EfficiencyResult = z.infer<typeof efficiencyResultSchema>;

const systemPrompt = `You are an expert n8n workflow evaluator focusing specifically on WORKFLOW EFFICIENCY.
Your task is to evaluate the efficiency of the workflow across three key metrics.

## CRITICAL: Understanding n8n Efficiency Patterns
- **AI agents with tools + separate nodes is NOT always duplication**
  - Agent tools are for AI-driven operations
  - Separate nodes may handle different data or validation
- **Backup/fallback paths are intentional redundancy for reliability**
- **Some "redundancy" improves maintainability and debugging**
- **Focus on actual inefficiencies, not architectural choices**

## Efficiency Metrics

### 1. Redundancy Score (0-1)
Evaluate if the workflow avoids redundant operations:
- Check for duplicate operations that could be consolidated
- Look for or  unnecessary data transformations
- Find redundant Set nodes that could be combined
- Score 1.0 = No redundancy, 0.0 = Highly redundant

**Violations for redundancy:**
- Critical: Same operation performed 3+ times unnecessarily
- Major: Clear duplication of logic or operations
- Minor: Small inefficiencies that could be optimized

### 2. Path Optimization (0-1)
Evaluate if the workflow uses optimal execution paths:
- Check if operations are in the most efficient order
- Identify paths that could be shortened or simplified
- Verify conditional logic doesn't create inefficient branches
- Score 1.0 = Optimal paths, 0.0 = Very inefficient paths

### 3. Node Count Efficiency (0-1)
Evaluate if the workflow uses the minimal number of nodes needed:
- Check if multiple operations could be combined into single nodes
- Look for unnecessary intermediate nodes
- Identify if simpler node types could achieve the same result
- Consider if the task complexity justifies the node count
- Score 1.0 = Minimal nodes for task, 0.0 = Excessive nodes

**Guidelines for node count:**
- Simple tasks (1-3 operations): 2-5 nodes expected
- Medium tasks (4-7 operations): 5-10 nodes expected
- Complex tasks (8+ operations): 10+ nodes acceptable
- Each node should have a clear purpose

**Violations for node count:**
- Critical: 2x+ more nodes than necessary
- Major: 50% more nodes than optimal
- Minor: A few extra nodes that could be consolidated

## Important Considerations

### DO NOT penalize for:
- Nodes required for proper error handling
- Necessary data validation steps
- Required authentication/setup nodes
- Legitimate use of multiple nodes for clarity/maintainability
- AI sub-nodes (they provide capabilities, not redundancy)

### Context Awareness:
- Consider the complexity of the user's request
- Some redundancy may be acceptable for reliability
- Clear separation of concerns can justify more nodes

## Scoring Instructions
1. Calculate each metric score (0-1)
2. Identify violations with point deductions
3. Overall score = average of the three metrics
4. Provide specific examples in the analysis

Focus on identifying clear inefficiencies, not micro-optimizations.`;

const humanTemplate = `Evaluate the efficiency of this workflow:

<user_prompt>
{userPrompt}
</user_prompt>

<generated_workflow>
{generatedWorkflow}
</generated_workflow>

{referenceSection}

Provide an efficiency evaluation with individual metric scores, overall score, violations, and analysis.`;

export function createEfficiencyEvaluatorChain(llm: BaseChatModel) {
	return createEvaluatorChain(llm, efficiencyResultSchema, systemPrompt, humanTemplate);
}

export async function evaluateEfficiency(
	llm: BaseChatModel,
	input: EvaluationInput,
): Promise<EfficiencyResult> {
	const result = await invokeEvaluatorChain(createEfficiencyEvaluatorChain(llm), input);

	// Ensure overall score is calculated as average of metrics
	const avgScore =
		(result.redundancyScore + result.pathOptimization + result.nodeCountEfficiency) / 3;
	result.score = avgScore;

	return result;
}
