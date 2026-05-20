export const AI_NODE_SELECTION = `AI node selection guidance:

AI Agent: Use for text analysis, summarization, classification, or any AI reasoning tasks.
OpenAI node: Use only for DALL-E, Whisper, Sora, or embeddings (these are specialized APIs that AI Agent cannot access).
Default chat model: OpenAI Chat Model provides the lowest setup friction for new users.
Tool nodes (ending in "Tool"): Connect to AI Agent via tool() for agent-controlled actions.
Text Classifier vs AI Agent: Text Classifier for simple categorization with fixed categories; AI Agent for complex multi-step classification requiring reasoning.
Memory nodes: Include with chatbot AI Agents to maintain conversation context across messages.
Structured Output Parser: Prefer this over manually extracting/parsing AI output with Set or Code nodes. Define the desired schema and the LLM handles parsing automatically. Use for classification, data extraction, or any workflow where AI output feeds into database storage, API calls, or Switch routing.

Multi-agent systems:
AI Agent Tool (@n8n/n8n-nodes-langchain.agentTool) contains an embedded AI Agent — it's a complete sub-agent that the main agent can call through tool(). Each AgentTool needs its own Chat Model. Node selection: 1 AI Agent + N AgentTools + (N+1) Chat Models.`;
