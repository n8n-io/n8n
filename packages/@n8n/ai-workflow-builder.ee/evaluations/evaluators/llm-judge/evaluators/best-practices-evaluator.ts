import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { z } from 'zod';

import { promptCategorizationChain } from '@/chains/prompt-categorization';
import { documentation } from '@/tools/best-practices';

import { createEvaluatorChain } from './base';
import type { EvaluationInput } from '../evaluation';

// Schema for best practices evaluation result
const bestPracticesResultSchema = z.object({
	score: z.number().min(0).max(1),
	violations: z.array(
		z.object({
			type: z.enum(['major', 'minor']),
			description: z.string(),
			pointsDeducted: z.number().min(0),
		}),
	),
	techniques: z
		.array(z.string())
		.describe(
			'Workflow techniques identified for this evaluation (e.g., chatbot, content-generation)',
		),
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

### Understanding Workflow Connections

n8n workflows can have multiple triggers and execution paths. When evaluating whether components are "connected," understand that n8n supports multiple connection methods beyond direct node-to-node data flow.

Valid Connection Methods:

1. **Direct Data Flow Connections**: Traditional node-to-node connections where data flows from source output to target input
   - Example: HTTP Request → Set → Database

2. **AI-Specific Connections**: Special connection types for AI nodes, denoted with brackets like [ai_memory], [ai_tool], [ai_embedding]
   - Memory nodes connected to multiple agents via [ai_memory] - enables agents to share conversation history
   - Tools connected to agents via [ai_tool] - provides capabilities to agents
   - Vector stores use [ai_embedding] and [ai_document] - for AI-powered data retrieval

   **CRITICAL: AI sub-nodes are the SOURCE of ai_* connections, NOT the target.**
   - Document Loader connects TO Vector Store (Document Loader is source, Vector Store is target)
   - Embeddings connects TO Vector Store (Embeddings is source, Vector Store is target)
   - Chat Model connects TO AI Agent (Chat Model is source, AI Agent is target)

   In the connections JSON, this appears as:
   \`\`\`json
   "Document Loader": { "ai_document": [[{ "node": "Vector Store", ... }]] }
   \`\`\`
   This means the connection EXISTS - Document Loader provides ai_document capability TO Vector Store.

   **NEVER flag "Vector Store missing Document Loader" if Document Loader has ai_document → Vector Store.**

3. **Shared Memory**: Multiple agents/workflows sharing the same memory node for context/data persistence
   - Same Window Buffer Memory connected to both a scheduled agent AND a chat agent
   - Both agents can access shared conversation history and context

4. **Vector Store Sharing**: Multiple workflows accessing the same vector store for data storage/retrieval
   - Scheduled workflow writes documents to Vector Store
   - Chat workflow queries the same Vector Store for information
   - Both workflows effectively share data through the vector store

5. **Data Storage Sharing**: Multiple workflows reading/writing to the same persistent storage
   - Database nodes (PostgreSQL, MongoDB, MySQL)
   - Spreadsheet services (Google Sheets, Airtable)
   - Data Tables (n8n's built-in storage)
   - One workflow writes data, another workflow reads it

6. **Tool-based Connections**: Agents connected through tool nodes
   - Agent Tool nodes allow one agent to invoke another agent
   - Tools provide indirect connections between workflow components

7. **Loop Patterns (Split In Batches)**: Intentional cycles for batch processing
   - Output 0 ("loop"): Fires for EACH batch - connect batch processing here
   - Output 1 ("done"): Fires once after ALL iterations complete - connect final processing here
   - Processing nodes loop BACK to Split In Batches input to continue the loop
   - This circular connection is CORRECT and INTENTIONAL - it creates the batch processing loop

   **NEVER flag as incorrect if:**
   - Output 1 connects to processing nodes
   - Processing nodes connect back to Split In Batches input (index 0)
   - Output 0 connects to aggregation/final step

   This is the standard n8n pattern for processing large datasets in batches.

8. **Shared Destination Pattern**: Multiple branches connecting to same node
   - Multiple Switch/IF outputs can ALL connect to the same downstream node
   - This is correct when all branches need the same final processing (e.g., save to database)
   - Do NOT use Merge for this - Merge waits for all inputs, but only one branch executes per item

9. **Chat Trigger Auto-Response**: Chat Trigger handles responses automatically
   - Chat Trigger (@n8n/n8n-nodes-langchain.chatTrigger) is BIDIRECTIONAL
   - AI Agent output is automatically sent back to the chat interface
   - There is NO main connection back to Chat Trigger - this is correct behavior
   - **NEVER flag "AI Agent has no connection back to Chat Trigger"** - responses are built-in

10. **Document Loader Input Pattern**: Document Loaders read from context, not main connections
    - Document Loaders have NO main input connections by design
    - They read binary data/URLs from workflow context based on their configuration
    - They OUTPUT via ai_document to Vector Store or other consumers
    - **NEVER flag "Document Loader has no main input"** or "Trigger not connected to Document Loader"

Before assessing there is a missing connection as per best practices documentation (for example a chatbot
should be connected to data from other triggered components of the workflow) make sure that there is no
possible connection, check all possible connections, ESPECIALLY agent nodes (memory and tools could
create the necessary connections).

Critical Evaluation Rule:
Before marking components as "disconnected," verify they have NO connection method - not just no direct data flow connection.

### Evaluating Configuration and Fields

If a best practice states that certain configuration should be applied, for example disabling n8n attribution
check to see if that has been specified as part of the generated workflows configuration or its additional fields.
If a node of the correct type has these settings present, then it is likely NOT in violation of the practice.

## Violation Criteria

**Major (-20 to -40 points):**
- Not following recommended approaches that significantly impact reliability or performance FOR THE REQUESTED USE CASE
- Using non-recommended nodes when better alternatives are documented and relevant
- Missing important safeguards that the documentation warns about IF they're relevant to the user's request
- Ignoring service-specific considerations that would impact the user's stated goals

**Minor (-5 to -20 points):**
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
- DO NOT mark optional features as critical violations when they weren't requested
`;

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
				techniques: categorization.techniques,
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
	const referenceSection =
		input.referenceWorkflows && input.referenceWorkflows.length > 0
			? `<reference_workflows>\n${JSON.stringify(input.referenceWorkflows, null, 2)}\n</reference_workflows>`
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
