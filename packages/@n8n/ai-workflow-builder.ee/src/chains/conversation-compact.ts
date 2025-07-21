import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import z from 'zod';

export async function conversationCompactChain(llm: BaseChatModel, messages: BaseMessage[]) {
	// Use structured output for consistent summary format
	const CompactedSession = z.object({
		summary: z.string().describe('A concise summary of the conversation so far'),
		key_decisions: z.array(z.string()).describe('List of key decisions and actions taken'),
		current_state: z.string().describe('Description of the current workflow state'),
		next_steps: z.string().describe('Suggested next steps based on the conversation'),
	});

	const modelWithStructure = llm.withStructuredOutput(CompactedSession);

	// Format messages for summarization
	const conversationText = messages
		.map((msg) => {
			if (msg instanceof HumanMessage) {
				// eslint-disable-next-line @typescript-eslint/no-base-to-string, @typescript-eslint/restrict-template-expressions
				return `User: ${msg.content}`;
			} else if (msg instanceof AIMessage) {
				// eslint-disable-next-line @typescript-eslint/no-base-to-string, @typescript-eslint/restrict-template-expressions
				return `Assistant: ${msg.content ?? 'Used tools'}`;
			}
			return '';
		})
		.filter(Boolean)
		.join('\n');

	const compactPrompt = `Please summarize the following conversation between a user and an AI assistant building an n8n workflow:

${conversationText}

Provide a structured summary that captures the key points, decisions made, current state of the workflow, and suggested next steps.`;

	const structuredOutput = await modelWithStructure.invoke(compactPrompt);

	// Create a new compacted message
	const compactedMessage = new AIMessage({
		content: `## Previous Conversation Summary

**Summary:** ${structuredOutput.summary}

**Key Decisions:**
${(structuredOutput.key_decisions as string[]).map((d: string) => `- ${d}`).join('\n')}

**Current State:** ${structuredOutput.current_state}

**Next Steps:** ${structuredOutput.next_steps}`,
	});

	// Keep only the last message(request to compact from user) plus the summary
	const lastUserMessage = messages.slice(-1);
	const newMessages = [lastUserMessage[0], compactedMessage];

	return {
		success: true,
		summary: structuredOutput,
		newMessages,
		messagesRemoved: messages.length - newMessages.length,
	};
}
