import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { z } from 'zod';

import { createEvaluatorChain } from './base';
import { promptCategorizationChain } from '../../../src/chains/prompt-categorization';
import { documentation } from '../../../src/tools/best-practices';
import type { EvaluationInput } from '../../types/evaluation';

// Schema for best practices evaluation result
const bestPracticesResultSchema = z.object({
	score: z.number().min(0).max(1),
	violations: z.array(
		z.object({
			type: z.enum(['critical', 'major', 'minor']),
			description: z.string(),
			pointsDeducted: z.number().min(0),
		}),
	),
	techniques: z
		.array(z.string())
		.describe(
			'Workflow techniques identified for this evaluation (e.g., chatbot, content-generation)',
		),
	analysis: z
		.string()
		.describe('Brief analysis of adherence to best practices for the identified techniques'),
});

export type BestPracticesResult = z.infer<typeof bestPracticesResultSchema>;

const systemPrompt = `You are an expert n8n workflow evaluator focusing specifically on BEST PRACTICES ADHERENCE.
Your task is to evaluate whether a generated workflow follows the documented best practices for its workflow type(s).

## Your Role
Evaluate ONLY adherence to the provided best practices documentation. Focus on whether the workflow follows recommended patterns, avoids common pitfalls, and uses nodes correctly.

## Context-Aware Evaluation Philosophy

**CRITICAL**: Always consider what the user actually requested in their prompt. Do not penalize workflows for missing features or safeguards that were not part of the user's requirements.

- If the user asked for a simple workflow without mentioning production readiness, error handling, or rate limiting, these should NOT be critical violations
- Only mark something as critical if it would prevent the workflow from fulfilling the user's specific request
- Consider the scope and complexity implied by the user's prompt

## Evaluation Criteria

### Check for these violations:

**Critical (-40 to -50 points):**
ONLY mark as critical if the violation would BREAK THE USER'S SPECIFIC USE CASE:
- Patterns that will cause the workflow to fail for what the user explicitly requested
- Using nodes in ways that are explicitly warned against as "Critical" severity and that affect the requested functionality
- Configuration mistakes that will break the core functionality the user asked for (e.g., wrong data types for required fields)
- Missing essential features that the user specifically requested

**Examples of what is NOT critical:**
- Missing error handling when the user didn't ask for production-ready workflow
- Missing rate limiting when the user didn't mention handling high volumes
- Missing advanced features when the user requested a basic workflow

**Major (-15 to -25 points):**
- Not following recommended approaches that significantly impact reliability or performance FOR THE REQUESTED USE CASE
- Using non-recommended nodes when better alternatives are documented and relevant
- Missing important safeguards that the documentation warns about IF they're relevant to the user's request
- Ignoring service-specific considerations that would impact the user's stated goals

**Minor (-5 to -10 points):**
- Using less optimal patterns that are documented as pitfalls but don't break functionality
- Missing optional best practices that would improve the workflow (like error handling when not requested)
- Missing production-ready features when the user asked for a basic/simple workflow
- Small deviations from recommended approaches that don't impact the user's goals
- Missing rate limiting, memory management, or advanced error handling when not requested

## Scoring Instructions
1. Start with 100 points
2. Read the user prompt carefully to understand what they actually requested
3. Deduct points for each violation found based on severity AND relevance to the user's request
4. Score cannot go below 0
5. Convert to 0-1 scale by dividing by 100

## Important Context
- You will be provided with best practices documentation relevant to the workflow type(s)
- Focus on whether the workflow follows the documented recommendations RELEVANT to the user's request
- Consider the specific nodes used and their documented pitfalls
- Evaluate against common mistakes mentioned in the documentation
- DO NOT penalize for missing best practices that aren't relevant to what the user asked for
- DO NOT create arbitrary best practices - only evaluate against what's documented
- DO NOT mark optional features as critical violations when they weren't requested`;

const humanTemplate = `Evaluate how well this workflow follows n8n best practices in the context of what the user requested.

<user_prompt>
{userPrompt}
</user_prompt>

<generated_workflow>
{generatedWorkflow}
</generated_workflow>

<best_practices_documentation>
{bestPractices}
</best_practices_documentation>

{referenceSection}

IMPORTANT: First, analyze what the user actually requested in their prompt. Then evaluate the workflow against best practices that are relevant to that request.

- If the user requested a simple/basic workflow, do NOT mark missing error handling or rate limiting as critical
- Only mark violations as critical if they would prevent the core requested functionality from working
- Consider whether advanced features (error handling, rate limiting, memory management) were part of the user's requirements

Provide a best practices evaluation with score, violations (citing specific best practices and explaining why they matter for THIS use case), and brief analysis.`;

export function createBestPracticesEvaluatorChain(llm: BaseChatModel) {
	return createEvaluatorChain(llm, bestPracticesResultSchema, systemPrompt, humanTemplate);
}

/**
 * Load relevant best practices documentation for the given user prompt
 * Returns both the documentation string and the identified techniques
 */
async function loadRelevantBestPractices(
	llm: BaseChatModel,
	userPrompt: string,
): Promise<{ documentation: string; techniques: string[] }> {
	try {
		// Categorize the prompt to determine which techniques apply
		const categorization = await promptCategorizationChain(llm, userPrompt);

		// Load best practices for identified techniques
		const relevantDocs: string[] = [];

		for (const technique of categorization.techniques) {
			const bestPractice = documentation[technique];
			if (bestPractice) {
				relevantDocs.push(
					`## Best Practices for ${technique}\n\n${bestPractice.getDocumentation()}`,
				);
			}
		}

		if (relevantDocs.length === 0) {
			return {
				documentation:
					'No specific best practices documentation available for this workflow type. Evaluate based on general n8n workflow principles.',
				techniques: [],
			};
		}

		return {
			documentation: relevantDocs.join('\n\n---\n\n'),
			techniques: categorization.techniques,
		};
	} catch (error) {
		// If categorization fails, return a message indicating no specific best practices
		return {
			documentation:
				'Unable to load specific best practices. Evaluate based on general n8n workflow principles.',
			techniques: [],
		};
	}
}

type BestPracticesChainInput = {
	userPrompt: string;
	generatedWorkflow: string;
	bestPractices: string;
	referenceSection: string;
};

export async function evaluateBestPractices(
	llm: BaseChatModel,
	input: EvaluationInput,
): Promise<BestPracticesResult> {
	// Load relevant best practices documentation and identify techniques
	const { documentation: bestPracticesDoc, techniques } = await loadRelevantBestPractices(
		llm,
		input.userPrompt,
	);

	// Prepare the reference section
	const referenceSection = input.referenceWorkflow
		? `<reference_workflow>\n${JSON.stringify(input.referenceWorkflow, null, 2)}\n</reference_workflow>`
		: '';

	// Invoke the evaluator chain with best practices
	const chain = createBestPracticesEvaluatorChain(llm);
	const chainInput: BestPracticesChainInput = {
		userPrompt: input.userPrompt,
		generatedWorkflow: JSON.stringify(input.generatedWorkflow, null, 2),
		bestPractices: bestPracticesDoc,
		referenceSection,
	};

	const result = await chain.invoke(chainInput);

	// Add the identified techniques to the result
	return {
		...result,
		techniques,
	};
}
