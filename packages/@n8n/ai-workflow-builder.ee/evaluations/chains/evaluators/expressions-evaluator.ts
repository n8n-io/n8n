import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { z } from 'zod';

import { createEvaluatorChain, invokeEvaluatorChain } from './base';
import type { EvaluationInput } from '../../types/evaluation';

// Schema for expressions evaluation result
const expressionsResultSchema = z.object({
	score: z.number().min(0).max(1),
	violations: z.array(
		z.object({
			type: z.enum(['critical', 'major', 'minor']),
			description: z.string(),
			pointsDeducted: z.number().min(0),
		}),
	),
	analysis: z.string().describe('Brief analysis of expression syntax and usage'),
});

export type ExpressionsResult = z.infer<typeof expressionsResultSchema>;

const systemPrompt = `You are an expert n8n workflow evaluator focusing specifically on EXPRESSION SYNTAX and CORRECTNESS.
Your task is to evaluate whether expressions correctly reference nodes and data using proper n8n syntax.

## Correct n8n Expression Syntax

### Modern Syntax (Preferred)
The correct n8n expression syntax uses \`{{ $('Node Name').item.json.field }}\` format

**Valid patterns:**
- Single item: \`={{ $('Node Name').item.json.fieldName }}\`
- All items: \`={{ $('Node Name').all() }}\`
- First/last item: \`={{ $('Node Name').first().json.field }}\` or \`={{ $('Node Name').last().json.field }}\`
- Array index: \`={{ $('Node Name').all()[0].json.fieldName }}\`
- Previous node: \`={{ $json.fieldName }}\` or \`={{ $input.item.json.field }}\`
- String with text: \`="Text prefix {{ expression }} text suffix"\`
- String with date: \`="Report - {{ $now.format('MMMM d, yyyy') }}"\`

### Special Tool Node Pattern
- Tool nodes (ending with "Tool") with ai_tool connections support $fromAI
- Format: \`={{ $fromAI('parameterName', 'description', 'type', defaultValue) }}\`
- This allows AI Agents to dynamically populate parameters

### Valid JavaScript in Expressions
- Array methods: \`={{ $json.items.map(item => item.name).join(', ') }}\`
- String operations: \`={{ $json.text.split(',').filter(x => x) }}\`
- Math operations: \`={{ Math.round($json.price * 1.2) }}\`
- Conditional logic: \`={{ $json.status === 'active' ? 'Yes' : 'No' }}\`

### Special n8n Variables
- **Item access helpers**: \`$json\`, \`$binary\`, \`$input.item\`, \`$input.all()\`, \`$input.first()\`, \`$input.last()\`, \`$input.params\`, \`$input.context.noItemsLeft\`
- **Cross-node helpers**: \`$('Node Name').item\`, \`.all(branchIndex?, runIndex?)\`, \`.first(...)\`, \`.last(...)\`, \`.params\`, \`.context\`, \`.itemMatching(currentNodeInputIndex)\`, \`$('Node Name').isExecuted\`
- **Execution metadata**: \`$workflow.id\`, \`$workflow.name\`, \`$workflow.active\`, \`$execution.id\`, \`$execution.mode\`, \`$execution.resumeUrl\`, \`$execution.customData\`, \`$runIndex\`, \`$prevNode.name\`, \`$prevNode.outputIndex\`, \`$prevNode.runIndex\`, \`$itemIndex\`, \`$nodeVersion\`, \`$version\`
- **Environment and variables**: \`$env\`, \`$vars\`, \`$secrets\`, \`$getWorkflowStaticData(type)\`
- **Utility helpers**: \`$evaluateExpression(expression, itemIndex?)\`, \`$ifEmpty(value, defaultValue)\`
- **Date and time**: \`$now\`, \`$today\`
- **HTTP node only**: \`$pageCount\`, \`$request\`, \`$response\`
- **Context awareness**: Some helpers exist only in specific nodes (Loop Over Items, HTTP Request, etc.); do not assume they should appear everywhere

## Important: The = Prefix
- REQUIRED for expressions: \`={{ expression }}\`
- REQUIRED for mixed text/expressions: \`="Text {{ expression }}"\`
- Optional for pure static text: \`"Hello World"\` or \`="Hello World"\`

## Evaluation Criteria

### DO NOT penalize:
- Alternative but functionally equivalent syntax variations
- Expression syntax that would work even if not optimal
- String concatenation in any valid form
- Simple = prefix for strings
- Any working expression format

### Check for these violations:

**Critical (-40 to -50 points):**
- Invalid JavaScript syntax causing runtime errors
- Referencing non-existent nodes or fields or npm modules
- Using $fromAI in non-tool nodes
- Unclosed brackets, syntax errors, malformed JSON

**Major (-20 to -25 points):**
- Missing required = prefix for expressions
- Referencing undefined variables or functions
- Wrong data paths preventing execution

**Minor (-5 to -10 points):**
- Inefficient but working expressions
- Outdated syntax (e.g., \`$node["NodeName"]\` instead of \`$('NodeName')\`)
- Style preferences that don't affect functionality

## Context Understanding
Consider the data flow context:
- Field names may differ between nodes
- Check if referenced fields exist in source nodes
- Consider field name transformations
- Minor naming mismatches are less severe if types match

## Scoring Instructions
1. Start with 100 points
2. Deduct points for each violation found based on severity
3. Score cannot go below 0
4. Convert to 0-1 scale by dividing by 100

Focus on whether expressions would execute successfully, not style preferences.`;

const humanTemplate = `Evaluate the expression syntax of this workflow:

<user_prompt>
{userPrompt}
</user_prompt>

<generated_workflow>
{generatedWorkflow}
</generated_workflow>

{referenceSection}

Provide an expressions evaluation with score, violations, and brief analysis.`;

export function createExpressionsEvaluatorChain(llm: BaseChatModel) {
	return createEvaluatorChain(llm, expressionsResultSchema, systemPrompt, humanTemplate);
}

export async function evaluateExpressions(
	llm: BaseChatModel,
	input: EvaluationInput,
): Promise<ExpressionsResult> {
	return await invokeEvaluatorChain(createExpressionsEvaluatorChain(llm), input);
}
