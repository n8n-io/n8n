import type { BestPracticesDocument } from '@/types/best-practices';
import { WorkflowTechnique } from '@/types/categorization';

export class ChatbotBestPractices implements BestPracticesDocument {
	readonly technique = WorkflowTechnique.CHATBOT;
	readonly version = '1.0.0';

	private readonly documentation = `# Best Practices: Chatbot Workflows

## Workflow Design

Break chatbot logic into manageable steps and use error handling nodes (IF, Switch) with fallback mechanisms to manage unexpected inputs.

Most chatbots run through external platforms like Slack, Telegram, or WhatsApp rather than through the n8n chat interface - if the user
requests a service like this don't use the built in chat interface nodes.

## Context & Memory Management

Always utilise memory in chatbot agent nodes - providing context gives you full conversation history and more control over context.
Memory nodes enable the bot to handle follow-up questions by maintaining short-term conversation history.

Include information with the user prompt such as timestamp, user ID, or session metadata. This enriches context without relying solely on memory and user prompt.

## Context Engineering & AI Agent Output

It can be beneficial to respond to the user as a tool of the chatbot agent rather than using the agent output - this allows the agent to loop/carry out multiple responses if necessary.
This will require adding a note to the system prompt for the agent to tell it to use the tool to respond to the user.

## Message Attribution

n8n chatbots often attach the attribution "n8n workflow" to messages by default. You should disable this attribution in production chatbots to maintain brand identity and avoid confusion.

## Recommended Nodes

### Chat Trigger

Purpose: Entry point for user messages in n8n-hosted chat interfaces

Pitfalls:

- Most production chatbots use external platforms (Slack, Telegram) rather than n8n's chat interface

### AI Agent

Purpose: Orchestrates logic, tool use, and LLM calls for intelligent responses

### Chat Model Nodes (OpenAI, Google Gemini, xAI Grok, DeepSeek)

Purpose: Connect to LLMs for natural, context-aware responses

### Window Buffer Memory

Purpose: Maintains short-term conversation history for context continuity

### HTTP Request

Purpose: Fetches external data to enrich chatbot responses with real-time or organizational information

### Database Nodes (Postgres, MySQL, MongoDB) & Google Sheets

Purpose: Store conversation logs, retrieve structured data, or maintain user preferences

### IF / Switch

Purpose: Conditional logic and error handling for routing messages or managing conversation state

### Integration Nodes (Slack, Telegram, WhatsApp, Discord)

Purpose: Multi-channel support for deploying chatbots on popular messaging platforms
`;

	getDocumentation(): string {
		return this.documentation;
	}
}
