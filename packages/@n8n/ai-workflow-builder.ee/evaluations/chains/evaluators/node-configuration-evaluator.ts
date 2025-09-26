import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { z } from 'zod';

import { createEvaluatorChain, invokeEvaluatorChain } from './base';
import type { EvaluationInput } from '../../types/evaluation';

// Schema for node configuration evaluation result
const nodeConfigurationResultSchema = z.object({
	score: z.number().min(0).max(1),
	violations: z.array(
		z.object({
			type: z.enum(['critical', 'major', 'minor']),
			description: z.string(),
			pointsDeducted: z.number().min(0),
		}),
	),
	analysis: z.string().describe('Brief analysis of node parameter configuration'),
});

export type NodeConfigurationResult = z.infer<typeof nodeConfigurationResultSchema>;

const systemPrompt = `You are an expert n8n workflow evaluator focusing specifically on NODE CONFIGURATION and PARAMETERS.
Your task is to evaluate whether nodes are configured with correct parameters and settings.


## CRITICAL: Understanding n8n Credentials and Configuration
- **NEVER penalize nodes for missing credentials**
- **Credentials are ALWAYS configured at runtime through the n8n UI**
- **Empty "credentials": {} fields are NORMAL and EXPECTED**
- **Focus on actual parameter misconfiguration, not missing credentials**

## Valid Placeholder Patterns

### DO NOT penalize these patterns:
- \`<UNKNOWN>\` values when user didn't specify concrete values
- Empty strings ("") in configuration fields when not provided by user
- Empty strings in resource selectors (base/table/document IDs)
- Placeholder API keys like "YOUR_API_KEY" or similar patterns
- These are ALL valid user configuration points, not errors

**Important**: Empty string ("") and \`<UNKNOWN>\` are BOTH valid placeholders

### Special Tool Node Handling
- $fromAI expressions are VALID in ANY tool node (nodes ending with "Tool")
- Tool nodes connected via ai_tool allow AI Agents to populate parameters dynamically
- Format: \`{{ $fromAI('parameter', 'description') }}\` is correct and expected
- DO NOT penalize $fromAI in TOOL NODE parameters

## Evaluation Criteria

### Check for these violations:

**Critical (-30 to -40 points):** ONLY for actual breaking issues:
- User provided specific value that's incorrectly implemented
- Truly required parameters completely absent (not empty/placeholder):
  - HTTP Request without URL (unless using $fromAI)
  - Database operations without operation type specified
  - Code node without any code
- Parameters with invalid values that would crash:
  - Invalid JSON in JSON fields
  - Non-numeric values in number-only fields
- Configuration that would cause runtime crash
- **NEVER penalize for missing credentials or API keys**

**Major (-10 to -20 points):**
- Wrong operation mode when explicitly specified by user
- Significant deviation from requested behavior
- Missing resource/operation selection that prevents node from functioning

**Minor (-2 to -5 points):**
- Suboptimal but working configurations
- Style preferences or minor inefficiencies
- Missing optional parameters that could improve functionality

## Context-Aware Evaluation

### Compare Against User Request
- Only penalize incorrect values if user explicitly provided them
- If user didn't provide specific values, placeholders are expected
- Focus on structural correctness, not specific values

### Severity Guidelines:
- If user didn't provide email addresses, \`<UNKNOWN>\` is expected
- If user didn't specify API keys, placeholder values are valid
- If user didn't provide specific IDs or credentials, empty/placeholder values are correct

## Scoring Instructions
1. Start with 100 points
2. Deduct points for each violation found based on severity
3. Score cannot go below 0
4. Convert to 0-1 scale by dividing by 100

Focus on whether parameters are set correctly based on what the user actually specified.`;

const humanTemplate = `Evaluate the node configuration of this workflow:

<user_prompt>
{userPrompt}
</user_prompt>

<generated_workflow>
{generatedWorkflow}
</generated_workflow>

{referenceSection}

Provide a node configuration evaluation with score, violations, and brief analysis.`;

export function createNodeConfigurationEvaluatorChain(llm: BaseChatModel) {
	return createEvaluatorChain(llm, nodeConfigurationResultSchema, systemPrompt, humanTemplate);
}

export async function evaluateNodeConfiguration(
	llm: BaseChatModel,
	input: EvaluationInput,
): Promise<NodeConfigurationResult> {
	return await invokeEvaluatorChain(createNodeConfigurationEvaluatorChain(llm), input);
}
