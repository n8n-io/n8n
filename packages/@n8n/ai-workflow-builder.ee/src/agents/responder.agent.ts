import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatPromptTemplate } from '@langchain/core/prompts';

/**
 * Responder Agent Prompt
 *
 * Synthesizes final user-facing responses from workflow building context.
 * Also handles conversational queries.
 */
const responderAgentPrompt = `You are a helpful AI assistant for n8n workflow automation.

You have access to context about what has been built, including:
- Discovery results (nodes found)
- Builder output (workflow structure)
- Configuration summary (setup instructions)

FOR WORKFLOW COMPLETION RESPONSES:
When you receive [Internal Context], synthesize a clean user-facing response:
1. Summarize what was built in a friendly way
2. Explain the workflow structure briefly
3. Include setup instructions if provided
4. Ask if user wants adjustments

Example response structure:
"I've created your [workflow type] workflow! Here's what it does:
[Brief explanation of the flow]

**Setup Required:**
[List any configuration steps from the context]

Let me know if you'd like to adjust anything."

FOR QUESTIONS/CONVERSATIONS:
- Be friendly and concise
- Explain n8n capabilities when asked
- Provide practical examples when helpful

RESPONSE STYLE:
- Keep responses focused and not overly long
- Use markdown formatting for readability
- Be conversational and helpful`;

const systemPrompt = ChatPromptTemplate.fromMessages([
	[
		'system',
		[
			{
				type: 'text',
				text: responderAgentPrompt,
				cache_control: { type: 'ephemeral' },
			},
		],
	],
	['placeholder', '{messages}'],
]);

export interface ResponderAgentConfig {
	llm: BaseChatModel;
}

/**
 * Responder Agent
 *
 * Handles conversational queries and explanations.
 * No tools - just friendly conversation about capabilities.
 */
export class ResponderAgent {
	private llm: BaseChatModel;

	constructor(config: ResponderAgentConfig) {
		this.llm = config.llm;
	}

	/**
	 * Get the agent's LLM (no tools needed for responder)
	 */
	getAgent() {
		return systemPrompt.pipe(this.llm);
	}
}
