import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { SystemMessage } from '@langchain/core/messages';
import { ChatPromptTemplate, HumanMessagePromptTemplate } from '@langchain/core/prompts';
import { OperationalError } from 'n8n-workflow';
import { z } from 'zod';

import type { EvaluationInput } from '../../types/evaluation';

// Schema for connections evaluation result
const connectionsResultSchema = z.object({
	score: z.number().min(0).max(1),
	violations: z.array(
		z.object({
			type: z.enum(['critical', 'major', 'minor']),
			description: z.string(),
			pointsDeducted: z.number().min(0),
		}),
	),
	analysis: z.string().describe('Brief analysis of node connections and data flow'),
});

export type ConnectionsResult = z.infer<typeof connectionsResultSchema>;

const systemPrompt = `You are an expert n8n workflow evaluator focusing specifically on NODE CONNECTIONS and DATA FLOW.
Your task is to evaluate whether nodes are properly connected with correct data flow patterns.

## Understanding n8n Connection Types

### Main vs AI Connections
n8n has two types of connections:
1. **Main connections**: Carry actual data between nodes (use "main" type)
2. **AI connections**: Provide capabilities to AI nodes (use "ai_*" types like ai_document, ai_textSplitter, ai_embedding, ai_tool, ai_languageModel, ai_memory)

### Important: AI Sub-nodes Are NOT Part of Main Data Flow
- Document Loader, Token Splitter, Embeddings, etc. nodes are AI sub-nodes
- They connect via ai_* connections to provide capabilities, NOT to process data
- Example: Document Loader -> Vector Store via "ai_document" provides document processing capability

### Valid AI Connection Patterns:
- Token Splitter -> Document Loader [ai_textSplitter]
- Document Loader -> Vector Store [ai_document]
- Embeddings -> Vector Store [ai_embedding]
- Tool nodes -> AI Agent [ai_tool]
- These nodes do NOT need main connections from data sources

## Evaluation Criteria

### DO NOT penalize:
- AI sub-nodes without main input connections (they use ai_* connections)
- Document Loader/Token Splitter not connected to Form (correct pattern)
- Tool nodes connected only via ai_tool connections (correct pattern)
- Empty/unconnected conditional branches when logic doesn't require them

### Check for these violations:

**Critical (-40 to -50 points):**
- Disconnected main nodes that process data (not AI sub-nodes)
- Wrong execution order that breaks workflow logic
- Missing connections that would cause workflow to fail
- Circular dependencies creating infinite loops

**Major (-15 to -25 points):**
- Missing data dependencies between main nodes
- Parallel execution errors where sequential is required
- Incorrect connection types (main vs ai_*)
- Data flow that doesn't follow logical sequence

**Minor (-5 to -10 points):**
- Redundant connections
- Suboptimal routing
- Unnecessary complexity in connection patterns

## Special Cases

### Conditional Nodes (IF, Switch)
- Have multiple outputs (true/false branches)
- Not all branches need to be connected if logic doesn't require it
- Empty/unconnected branches are valid when that condition isn't handled

## Scoring Instructions
1. Start with 100 points
2. Deduct points for each violation found based on severity
3. Score cannot go below 0
4. Convert to 0-1 scale by dividing by 100

Focus on whether connections enable proper data flow and workflow execution.`;

const humanTemplate = `Evaluate the connections and data flow of this workflow:

<user_prompt>
{userPrompt}
</user_prompt>

<generated_workflow>
{generatedWorkflow}
</generated_workflow>

{referenceSection}

Provide a connections evaluation with score, violations, and brief analysis.`;

export function createConnectionsEvaluatorChain(llm: BaseChatModel) {
	if (!llm.bindTools) {
		throw new OperationalError("LLM doesn't support binding tools");
	}

	const prompt = ChatPromptTemplate.fromMessages([
		new SystemMessage(systemPrompt),
		HumanMessagePromptTemplate.fromTemplate(humanTemplate),
	]);

	const llmWithStructuredOutput = llm.withStructuredOutput(connectionsResultSchema);
	return prompt.pipe(llmWithStructuredOutput);
}

export async function evaluateConnections(
	llm: BaseChatModel,
	input: EvaluationInput,
): Promise<ConnectionsResult> {
	const chain = createConnectionsEvaluatorChain(llm);

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

	return result as ConnectionsResult;
}
