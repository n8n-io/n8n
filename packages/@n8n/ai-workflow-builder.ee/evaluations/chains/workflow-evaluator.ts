import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { SystemMessage } from '@langchain/core/messages';
import { ChatPromptTemplate, HumanMessagePromptTemplate } from '@langchain/core/prompts';
import { OperationalError } from 'n8n-workflow';
import type { z } from 'zod';

import { evaluationResultSchema, type EvaluationInput } from '../types/evaluation';

const systemPrompt = `You are an expert n8n workflow evaluator. Your task is to evaluate a generated n8n workflow against a user's requirements and compare it to a reference workflow. Score the workflow across multiple categories and identify specific violations.

## Inputs Provided:
1. **User Prompt**: The original request describing what the workflow should do
2. **Reference Workflow**: An example workflow (optional)
3. **Generated Workflow**: The workflow to evaluate

## Evaluation Categories and Scoring

### 1. Functional Correctness (35% weight)
Evaluate whether the workflow correctly implements what the user requested.

**Check for these violations:**
- **Critical (-40 to -50 points)**: Missing core functionality, incorrect operation logic
- **Major (-15 to -25 points)**: Missing required data transformations, incomplete implementation, wrong conditional logic
- **Minor (-5 to -10 points)**: Missing optional features mentioned by user

**Questions to consider:**
- Does the workflow perform all requested operations?
- Are the operations in the correct logical sequence?
- Does it handle all scenarios mentioned in the user prompt?
- Are data transformations implemented correctly?

### 2. Connections (25% weight)
Evaluate whether nodes are properly connected with correct data flow.

**Check for these violations:**
- **Critical (-40 to -50 points)**: Disconnected nodes (nodes with no incoming connection), wrong execution order
- **Major (-15 to -25 points)**: Missing data dependencies, parallel execution errors
- **Minor (-5 to -10 points)**: Redundant connections, suboptimal routing

**Questions to consider:**
- Is every node properly connected to the workflow?
- Do connections follow the logical flow of data?
- Are nodes that depend on each other's data properly connected in sequence?
- Are there any unnecessary or redundant connections?

### 3. Expressions (25% weight)
Evaluate whether expressions correctly reference nodes and data using modern n8n syntax.

**Correct n8n expression syntax uses \`{{ $('Node Name').item.json.field }}\` format**

**Check for these violations:**
- **Critical (-40 to -50 points)**: Referencing non-existent nodes, wrong data paths
- **Major (-15 to -25 points)**: Missing quotes around node names, incorrect array access, wrong method usage (.item vs .all()), type mismatches, hardcoded values instead of dynamic references
- **Minor (-5 to -15 points)**: Missing json accessor, using outdated $node["name"] syntax, inefficient expressions

**Valid expression patterns:**
- Single item: \`{{ $('Node Name').item.json.fieldName }}\`
- All items: \`{{ $('Node Name').all() }}\`
- First item: \`{{ $('Node Name').all()[0].json.fieldName }}\`
- Previous node: \`{{ $json.fieldName }}\`

### 4. Node Configuration (15% weight)
Evaluate whether nodes are configured with correct parameters and settings.

**Check for these violations:**
- **Critical (-40 to -50 points)**: Missing required parameters (e.g., HTTP node without URL)
- **Major (-15 to -25 points)**: Wrong operation mode, incorrect authentication type, missing field mappings
- **Minor (-5 to -10 points)**: Wrong data format selection, suboptimal settings

**Questions to consider:**
- Are all required node parameters filled in?
- Are the correct operations selected (e.g., Create vs Update)?
- Are authentication methods appropriate?
- Are field mappings complete and correct?

### 5. Structural Similarity to Reference (0% if no reference provided)
If a reference workflow is provided, evaluate how well the generated workflow follows similar patterns.

**Only evaluate this if a reference workflow is provided. Check for:**
- Uses similar node types for similar operations
- Follows similar architectural patterns
- Adopts consistent naming conventions

## Scoring Instructions:

1. Start each category at 100 points
2. Deduct points for each violation found based on severity
3. A category score cannot go below 0
4. Calculate weighted final score:
   - Functional Correctness: 35%
   - Connections: 25%
   - Expressions: 25%
   - Node Configuration: 15%

Remember: Focus on objective technical evaluation. Be specific about violations and reference exact node names and expressions when identifying issues.`;

const humanTemplate = `Please evaluate the following workflow:

<user_prompt>
{userPrompt}
</user_prompt>

<generated_workflow>
{generatedWorkflow}
</generated_workflow>

{referenceSection}

Provide a detailed evaluation following the scoring guidelines.`;

export function createWorkflowEvaluatorChain(llm: BaseChatModel) {
	if (!llm.bindTools) {
		throw new OperationalError("LLM doesn't support binding tools");
	}

	const prompt = ChatPromptTemplate.fromMessages([
		new SystemMessage(systemPrompt),
		HumanMessagePromptTemplate.fromTemplate(humanTemplate),
	]);

	const llmWithStructuredOutput = llm.withStructuredOutput(evaluationResultSchema);
	return prompt.pipe(llmWithStructuredOutput);
}

export async function evaluateWorkflow(llm: BaseChatModel, input: EvaluationInput) {
	const chain = createWorkflowEvaluatorChain(llm);

	// Format reference section if reference workflow is provided
	const referenceSection = input.referenceWorkflow
		? `<reference_workflow>
${JSON.stringify(input.referenceWorkflow, null, 2)}
</reference_workflow>`
		: '';

	const result = await chain.invoke({
		userPrompt: input.userPrompt,
		generatedWorkflow: JSON.stringify(input.generatedWorkflow, null, 2),
		referenceSection,
	});

	return result as z.infer<typeof evaluationResultSchema>;
}

// Helper function to calculate weighted score
export function calculateWeightedScore(result: {
	functionality: { score: number };
	connections: { score: number };
	expressions: { score: number };
	nodeConfiguration: { score: number };
	structuralSimilarity?: { score: number; applicable: boolean };
}) {
	const weights = {
		functionality: 0.35,
		connections: 0.25,
		expressions: 0.25,
		nodeConfiguration: 0.15,
	};

	let totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
	let weightedSum =
		result.functionality.score * weights.functionality +
		result.connections.score * weights.connections +
		result.expressions.score * weights.expressions +
		result.nodeConfiguration.score * weights.nodeConfiguration;

	// Add structural similarity if applicable
	if (result.structuralSimilarity?.applicable) {
		const structuralWeight = 0.1; // 10% when available
		// Adjust other weights proportionally
		const scaleFactor = (1 - structuralWeight) / totalWeight;
		weightedSum = weightedSum * scaleFactor + result.structuralSimilarity.score * structuralWeight;
		totalWeight = 1;
	}

	return weightedSum / totalWeight;
}
