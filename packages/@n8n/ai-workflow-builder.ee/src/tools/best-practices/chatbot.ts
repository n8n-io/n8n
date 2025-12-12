import type { BestPracticesDocument } from '@/types/best-practices';
import { WorkflowTechnique } from '@/types/categorization';

export class ChatbotBestPractices implements BestPracticesDocument {
	readonly technique = WorkflowTechnique.CHATBOT;
	readonly version = '1.0.0';

	private readonly documentation = `# Best Practices: Chatbot Workflows

## Workflow Design

Break chatbot logic into manageable steps and use error handling nodes (IF, Switch) with fallback mechanisms to manage unexpected inputs.

Most chatbots run through external platforms like Slack, Telegram, or WhatsApp rather than through the n8n chat interface - if the user
requests a service like this don't use the built in chat interface nodes. If the user mentions chatting but does not mention a service
then use the built in n8n chat node.

CRITICAL: The user may ask to be able to chat to a workflow as well as trigger it via some other method, for example scheduling information
gathering but also being able to chat with the agent - in scenarios like this the two separate workflows MUST be connected through shared memory,
vector stores, data storage, or direct connections.

Example pattern:
- Schedule Trigger → News Gathering Agent → [memory node via ai_memory]
- Chat Trigger → Chatbot Agent → [SAME memory node via ai_memory]
- Result: Both agents share conversation/context history, enabling the chatbot to discuss gathered news

For the chatbot always use the same chat node type as used for response. If Telegram has been requested trigger the chatbot via telegram AND
respond via telegram - do not mix chatbot interfaces.

## Context & Memory Management

Always utilise memory in chatbot agent nodes - providing context gives you full conversation history and more control over context.
Memory nodes enable the bot to handle follow-up questions by maintaining short-term conversation history.

Include information with the user prompt such as timestamp, user ID, or session metadata. This enriches context without relying solely on memory and user prompt.

If there are other agents involved in the workflow you should share memory between the chatbot and those other agents where it makes sense.
Connect the same memory node to multiple agents to enable data sharing and context continuity.

## Context Engineering & AI Agent Output

It can be beneficial to respond to the user as a tool of the chatbot agent rather than using the agent output - this allows the agent to loop/carry out multiple responses if necessary.
This will require adding a note to the system prompt for the agent to tell it to use the tool to respond to the user.

## Message Attribution

n8n chatbots often attach the attribution "n8n workflow" to messages by default - you must disable this setting which will
often be called "Append n8n Attribution" for nodes that support it, add this setting and set it to false.

## Recommended Nodes

### Chat Trigger (@n8n/n8n-nodes-langchain.chatTrigger)

Purpose: Entry point for user messages in n8n-hosted chat interfaces. It is a great way to start without needing credentials. When user does not specify a chat trigger node, use this node and inform the user to swap it to the external chat platform node, once they have tested rest of their workflow.

Pitfalls:
- Most production chatbots use external platforms (Slack, Telegram) rather than n8n's chat interface

### AI Agent (@n8n/n8n-nodes-langchain.agent)

Purpose: Orchestrates logic, tool use, and LLM calls for intelligent responses.

Always use the AI Agent node, not provider-specific nodes (like OpenAI, Google Gemini) or use-case-specific AI nodes (like Message a model) for chatbot workflows. The AI Agent node provides better orchestration, tool integration, and memory management capabilities essential for conversational interfaces.
For example, for "create a chatbot using OpenAI", implement: n8n-nodes-langchain.agent with n8n-nodes-langchain.lmChatOpenAi node.

### Simple Memory (@n8n/n8n-nodes-langchain.memoryBufferWindow)

Purpose: Maintains short-term conversation history for context continuity

### Guardrail (@n8n/n8n-nodes-langchain.guardrails)

Purpose: Protects the chatbot from malicious input or generating undesirable responses.
You can add an input guardrail node between the user input and AI Agent.
You can add an output guardrail node after AI Agent.

### HTTP Request (n8n-nodes-base.httpRequest)

Purpose: Fetches external data to enrich chatbot responses with real-time or organizational information

### Database Nodes & Google Sheets

- Postgres (n8n-nodes-base.postgres)
- MySQL (n8n-nodes-base.mySql)
- MongoDB (n8n-nodes-base.mongoDb)
- Google Sheets (n8n-nodes-base.googleSheets)

Purpose: Store conversation logs, retrieve structured data, or maintain user preferences

### IF / Switch

- If (n8n-nodes-base.if)
- Switch (n8n-nodes-base.switch)

Purpose: Conditional logic and error handling for routing messages or managing conversation state

### Integration Nodes

- Slack (n8n-nodes-base.slack)
- Telegram (n8n-nodes-base.telegram)
- WhatsApp Business Cloud (n8n-nodes-base.whatsApp)
- Discord (n8n-nodes-base.discord)

Purpose: Multi-channel support for deploying chatbots on popular messaging platforms

## Common Pitfalls to Avoid

### Leaving Chatbot Disconnected

When a workflow has multiple triggers (e.g., scheduled data collection + chatbot interaction), the chatbot MUST have access to the data
generated by the workflow. Connect the chatbot through shared memory, vector stores, data storage, or direct data flow connections.
`;

	getDocumentation(): string {
		return this.documentation;
	}
}
