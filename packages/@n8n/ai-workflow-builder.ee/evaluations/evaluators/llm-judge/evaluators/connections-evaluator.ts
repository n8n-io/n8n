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

<loop_and_multi_output_patterns>
## Split In Batches (Loop Node)
Split In Batches has TWO outputs with specific semantics:
- Output 0 ("done"): Fires ONCE after ALL batches complete. Connect aggregation/final processing here.
- Output 1 ("loop"): Fires for EACH batch. Connect processing nodes here.

Correct loop pattern:
1. Split In Batches output 1 → Processing Node(s) → Split In Batches INPUT (index 0)
2. Split In Batches output 0 → Next workflow step

CRITICAL: The loop-back connection goes to the node's INPUT (index 0), creating a cycle. This is CORRECT behavior.
Do NOT flag "Split In Batches connects to itself" or "circular connection" as an error - this IS the loop pattern.

Example correct connections JSON:
  "Split In Batches": {
    "main": [
      [{ "node": "Aggregate", "type": "main", "index": 0 }],     // Output 0 (done) → final step
      [{ "node": "HTTP Request", "type": "main", "index": 0 }]   // Output 1 (loop) → processing
    ]
  },
  "HTTP Request": {
    "main": [
      [{ "node": "Split In Batches", "type": "main", "index": 0 }]  // Loop back to INPUT - CORRECT
    ]
  }

## Switch and IF Nodes (Multi-Output)
Switch and IF nodes route data to different outputs:
- IF: Output 0 = true branch, Output 1 = false branch
- Switch: Outputs 0 to N-1 = case branches

SHARED DESTINATION PATTERN:
Multiple outputs can ALL connect to the same downstream node. This is valid when different branches need the same final processing:
  Switch output 0 → Database
  Switch output 1 → Database
  Switch output 2 → Database

Do NOT flag multiple connections to the same target as redundant - it's the correct pattern for routing different cases to a shared destination without using Merge (which would wait forever since only one branch executes per item).
</loop_and_multi_output_patterns>

<chat_trigger_patterns>
## Chat Trigger and Chat Interface Nodes
Chat Trigger (@n8n/n8n-nodes-langchain.chatTrigger) is a BIDIRECTIONAL node that handles both input AND output automatically.

CRITICAL: Chat Trigger does NOT need a return connection from downstream nodes.
- Chat Trigger receives user messages and starts the workflow
- AI Agent or other nodes process the message
- The response is automatically sent back through Chat Trigger's built-in response mechanism
- There is NO "main" connection back to Chat Trigger - this is correct behavior

Valid chat workflow pattern:
  Chat Trigger → AI Agent (with Chat Model via ai_languageModel)

The AI Agent's output is automatically routed back to the chat interface. Do NOT flag "AI Agent has no connection back to Chat Trigger" as an error.

## Node Positioning
Node positions (x, y coordinates) in the workflow JSON are for VISUAL LAYOUT ONLY.
- Position does NOT affect execution order
- Execution order is determined by connections, not positions
- A trigger at position [250, 450] executes before a node at [250, 300] if connected that way
- Do NOT flag node positioning as a connection or execution flow issue
</chat_trigger_patterns>

<document_loader_patterns>
## Document Loader Connection Rules
Document Loader nodes (@n8n/n8n-nodes-langchain.documentLoader*) are CAPABILITY-ONLY nodes.

CRITICAL rules for Document Loaders:
1. Document Loaders have NO main input connections - this is correct by design
2. Document Loaders provide ai_document capability to Vector Store or other consumers
3. Document Loaders read data from workflow context (binary data, URLs) based on their configuration
4. The data source is configured in the Document Loader's parameters, NOT passed via main connection

Valid pattern:
  Form Trigger → Vector Store (main connection for triggering insert)
  Document Loader → Vector Store (ai_document capability)

The Form Trigger does NOT connect to Document Loader. The Document Loader reads the binary data from workflow context automatically.

Do NOT flag these as errors:
- "Document Loader has no main input connection" - correct, it uses ai_document output only
- "Missing connection from Trigger to Document Loader" - incorrect expectation
- "Document Loader is disconnected" - check for ai_document connection instead
</document_loader_patterns>

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

Critical violations (40-50 points): Breaks in main execution path where trigger or data source has no downstream connection. Missing mandatory main inputs for data processing nodes.

Major violations (15-25 points): Wrong connection type used. Hybrid nodes missing required connections for their configured mode. Data dependencies out of order.

Minor violations (5-10 points): Branches that should merge but remain isolated. Unused conditional branches without clear termination.

IMPORTANT - These are NOT violations:
- Capability-only nodes without main connections (correct design)
- Split In Batches loop-back connections (correct loop pattern)
- Multiple Switch/IF outputs connecting to the same destination (shared destination pattern)
- Chat Trigger with no return connection from AI Agent (auto-response is built-in)
- Document Loader with no main input (reads from workflow context, outputs via ai_document)
- Node positions not matching visual execution flow (positions are layout only)

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
