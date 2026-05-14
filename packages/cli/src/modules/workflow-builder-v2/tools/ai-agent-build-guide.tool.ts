import { Tool } from '@n8n/agents';
import type { BuiltTool } from '@n8n/agents';
import { z } from 'zod';

const inputSchema = z.object({
	goal: z.string().optional().describe('Optional short description of the AI step being built.'),
});

const GUIDE = `AI Agent / LangChain node-building guide for this POC:

Use top-level AI root nodes as normal workflow steps only when the user explicitly needs AI/LLM behavior.

Top-level AI root nodes:
- @n8n/n8n-nodes-langchain.agent: use when the AI must reason and call tools.
- @n8n/n8n-nodes-langchain.chainLlm: use for a single prompt/response transformation.
- @n8n/n8n-nodes-langchain.informationExtractor, textClassifier, sentimentAnalysis: use when the task matches that narrow purpose.

Sub-node purposes:
- Language model sub-nodes (lmChatOpenAi, lmChatAnthropic, lmChatGoogleGemini, etc.) provide the required model connection for AI roots.
- Tool sub-nodes (toolHttpRequest, toolWorkflow, toolCalculator, etc.) give an AI Agent callable tools.
- Memory sub-nodes (memoryBufferWindow, memoryPostgresChat, etc.) add chat/conversation history.
- Output parser sub-nodes (outputParserStructured, outputParserItemList, etc.) constrain AI output for downstream nodes.

Important constraints:
- Do not propose sub-nodes as normal main-chain ghosts. They are not standalone workflow steps.
- Sub-nodes connect with specialized AI connection types, not the main connection.
- In full-workflow chat mode, add required AI sub-nodes by passing connectionContext to propose_nodes. Use the AI root node id, mode "inputs", the required AI connection type, and the target input index.
- Prefer non-AI nodes when the workflow can be solved deterministically.

Minimal pattern:
1. Main chain data source -> AI root node -> downstream action.
2. AI root gets at least one language model sub-node connection.
3. Add tool/memory/output parser sub-nodes only if the task needs them.

Example language model support proposal after an AI Agent was committed:
propose_nodes({
  insertionPoint: { kind: "after", afterNodeId: "<ai-agent-node-id>" },
  connectionContext: {
    nodeId: "<ai-agent-node-id>",
    mode: "inputs",
    type: "ai_languageModel",
    index: 0
  },
  candidates: [{
    nodeType: "@n8n/n8n-nodes-langchain.lmChatOpenAi",
    version: 1,
    displayName: "OpenAI Chat Model",
    reason: "Provides the required language model connection for the AI Agent."
  }]
})
`;

export function createAiAgentBuildGuideTool(): BuiltTool {
	return new Tool('get_ai_agent_build_guide')
		.description(
			'Read this before proposing an AI Agent, Chain, language model, memory, AI tool, or output parser node. ' +
				'It explains which LangChain nodes are top-level workflow steps and which are sub-nodes that only make specialized AI connections.',
		)
		.input(inputSchema)
		.handler(async () => ({ guide: GUIDE }))
		.build();
}
