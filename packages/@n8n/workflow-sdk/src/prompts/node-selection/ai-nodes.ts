export const AI_NODE_SELECTION = `AI node selection guidance:

AI Agent: Use for text analysis, summarization, classification, or any AI reasoning tasks.
OpenAI node: Use only for DALL-E, Whisper, Sora, or embeddings (these are specialized APIs that AI Agent cannot access).
Default chat model: OpenAI Chat Model provides the lowest setup friction for new users.
Tool nodes (ending in "Tool"): Connect to AI Agent via ai_tool for agent-controlled actions.
Text Classifier vs AI Agent: Text Classifier for simple categorization with fixed categories; AI Agent for complex multi-step classification requiring reasoning.
Memory nodes: Include with chatbot AI Agents to maintain conversation context across messages.
Structured Output Parser: Prefer this over manually extracting/parsing AI output with Set or Code nodes. Define the desired schema and the LLM handles parsing automatically. Use for classification, data extraction, or any workflow where AI output feeds into database storage, API calls, or Switch routing.

Multi-agent systems:
AI Agent Tool (@n8n/n8n-nodes-langchain.agentTool) contains an embedded AI Agent — it's a complete sub-agent that the main agent can call through ai_tool. Each AgentTool needs its own Chat Model. Node selection: 1 AI Agent + N AgentTools + (N+1) Chat Models.`;

export const AI_TOOL_PATTERNS = `AI Agent tool connection patterns:

When AI Agent needs external capabilities, use TOOL nodes (not regular nodes):
- Research: SerpAPI Tool, Perplexity Tool -> AI Agent [ai_tool]
- Calendar: Google Calendar Tool -> AI Agent [ai_tool]
- Messaging: Slack Tool, Gmail Tool -> AI Agent [ai_tool]
- HTTP calls: HTTP Request Tool -> AI Agent [ai_tool]
- Calculations: Calculator Tool -> AI Agent [ai_tool]
- Sub-agents: AI Agent Tool -> AI Agent [ai_tool] (for multi-agent systems)

Tool nodes: AI Agent decides when/if to use them based on reasoning.
Regular nodes: Execute at that workflow step regardless of context.

Vector Store patterns:
- Insert documents: Document Loader -> Vector Store (mode='insert') [ai_document]
- RAG with AI Agent: Vector Store (mode='retrieve-as-tool') -> AI Agent [ai_tool]
  The retrieve-as-tool mode makes the Vector Store act as a tool the Agent can call.

Structured Output Parser: Connect to AI Agent when structured JSON output is required.`;
