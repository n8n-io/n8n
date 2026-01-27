import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { z } from 'zod';

import { createEvaluatorChain, invokeEvaluatorChain } from './base';
import type { EvaluationInput } from '../evaluation';

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

const systemPrompt = `You are an expert n8n workflow evaluator focusing on node connections and data flow. Verify that connections follow n8n's sourcing rules, support the requested behaviour, and respect AI capability patterns.

<reading_n8n_connection_json>
The workflow JSON structure uses the outer key as the SOURCE node. This is critical for correct analysis.

Structure:
  "connections": {
    "SOURCE_NODE": {
      "connection_type": [[{ "node": "TARGET_NODE", "type": "connection_type", "index": 0 }]]
    }
  }

Reading this JSON: SOURCE_NODE outputs to TARGET_NODE via connection_type.

Example:
  "Form Trigger": {
    "main": [[{ "node": "Set Node", "type": "main", "index": 0 }]]
  }

This means Form Trigger connects TO Set Node (Form Trigger is source, Set Node is target). Data flows from Form Trigger to Set Node.

For AI capability connections:
  "Text Splitter": {
    "ai_textSplitter": [[{ "node": "Document Loader", "type": "ai_textSplitter", "index": 0 }]]
  }

This means Text Splitter provides its capability TO Document Loader. Text Splitter is the source, Document Loader is the target. This is the correct direction for ai_* connections because sub-nodes provide capabilities to parent nodes.
</reading_n8n_connection_json>

<connection_model>
Main connections (type: main) carry runtime data between workflow nodes. They flow from data producers to data consumers, forming the primary execution path from trigger through processing to outputs.

AI capability connections (types: ai_languageModel, ai_memory, ai_tool, ai_document, ai_embedding, ai_textSplitter, ai_outputParser) let sub-nodes provide capabilities to parent nodes. The sub-node is always the source. For example, a Chat Model provides ai_languageModel capability to an AI Agent, so the connection goes Chat Model to AI Agent.

Capability-only nodes like Document Loader, Text Splitter, Embeddings, LLMs, Output Parsers, and Tool nodes exist purely to provide ai_* capabilities. They have no main inputs or outputs by design. Document Loader appearing without main connections is correct architecture, not a problem.

Hybrid nodes like Vector Store and AI Agent participate in both main data flow and ai_* capability networks simultaneously. A Vector Store in insert mode receives main data and also receives ai_document from Document Loader and ai_embedding from Embeddings.
</connection_model>

<rag_pipeline_architecture>
In RAG workflows, data flows through main connections while capabilities flow through ai_* connections:

Data Source connects to Vector Store via main (triggers the insert operation).
Document Loader connects to Vector Store via ai_document (provides document processing).
Text Splitter connects to Document Loader via ai_textSplitter (provides chunking).
Embeddings connects to Vector Store via ai_embedding (provides vectorization).

The Document Loader reads from workflow context based on its configuration. It does not receive data through main connections. This is intentional design.

Valid connection directions for RAG:
  Text Splitter to Document Loader via ai_textSplitter
  Document Loader to Vector Store via ai_document
  Embeddings to Vector Store via ai_embedding
  Language Model to AI Agent via ai_languageModel
  Tool nodes to AI Agent via ai_tool
  Memory nodes to AI Agent via ai_memory
</rag_pipeline_architecture>

<validation_process>
Work through these steps in your analysis:

1. Parse all connections from the JSON. For each entry, identify the source node (the JSON key) and the target node (the "node" field inside). Write each as: Source to Target via connection_type.

2. Identify capability-only nodes (Document Loader, Text Splitter, Embeddings, LLMs, Output Parsers, Tools, Memory). These nodes correctly have no main connections.

3. Verify the main execution path flows from trigger through processing nodes. Each non-capability node that processes data should have appropriate main connections.

4. Verify ai_* connections point from sub-nodes to parent nodes. The sub-node providing the capability should be the source (the JSON key).

5. For hybrid nodes, confirm they have both their required main connections and ai_* capability connections based on their mode.
</validation_process>

<scoring>
Start with 100 points and deduct for violations:

Critical violations (40-50 points): Breaks in main execution path where trigger or data source has no downstream connection. Missing mandatory main inputs for data processing nodes. Cycles that would deadlock execution.

Major violations (15-25 points): Wrong connection type used. Hybrid nodes missing required connections for their configured mode. Data dependencies out of order.

Minor violations (5-10 points): Redundant connections. Branches that should merge but remain isolated. Unused conditional branches without clear termination.

Capability-only nodes without main connections is correct design. Only flag issues for nodes that actually process data on the main path.

Convert final score to 0-1 scale by dividing by 100.
</scoring>`;

const humanTemplate = `Evaluate the connections and data flow of this workflow:

<user_prompt>
{userPrompt}
</user_prompt>

<generated_workflow>
{generatedWorkflow}
</generated_workflow>

{referenceSection}

Conduct your analysis in <analysis> tags, systematically parsing the connection JSON (remember: the JSON key is the SOURCE node, the "node" field is the TARGET). Then provide your evaluation with score, violations array, and brief analysis.`;

export function createConnectionsEvaluatorChain(llm: BaseChatModel) {
	return createEvaluatorChain(llm, connectionsResultSchema, systemPrompt, humanTemplate);
}

export async function evaluateConnections(
	llm: BaseChatModel,
	input: EvaluationInput,
): Promise<ConnectionsResult> {
	return await invokeEvaluatorChain(createConnectionsEvaluatorChain(llm), input);
}
