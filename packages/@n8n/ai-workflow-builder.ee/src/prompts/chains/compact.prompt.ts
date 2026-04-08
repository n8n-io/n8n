import { PromptTemplate } from '@langchain/core/prompts';

/** Template for summarizing multi-turn conversations into a structured format */
export const compactPromptTemplate = PromptTemplate.fromTemplate(
	`Please summarize the following conversation between a user and an AI assistant building an n8n workflow:

<previous_summary>
{previousSummary}
</previous_summary>

<conversation>
{conversationText}
</conversation>

Provide a structured summary that captures the key points, decisions made, current state of the workflow, and suggested next steps.`,
);
