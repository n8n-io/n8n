import type { StoryFn } from '@storybook/vue3-vite';

import N8nPromptInputSuggestions from './N8nPromptInputSuggestions.vue';
import type { WorkflowSuggestion } from '../../types/assistant';
import N8nPromptInput from '../N8nPromptInput';

export default {
	title: 'Assistant/PromptInputSuggestions',
	component: N8nPromptInputSuggestions,
	argTypes: {
		suggestionClick: { action: 'suggestion-clicked' },
	},
};

const mockSuggestions: WorkflowSuggestion[] = [
	{
		id: 'invoice-pipeline',
		summary: 'Invoice processing pipeline',
		prompt:
			'Create an invoice parsing workflow using n8n forms. Extract key information and store in Airtable.',
	},
	{
		id: 'ai-news-digest',
		summary: 'Daily AI news digest',
		prompt:
			'Create a workflow that fetches the latest AI news every morning at 8 AM and sends a summary via Telegram.',
	},
	{
		id: 'rag-assistant',
		summary: 'RAG knowledge assistant',
		prompt:
			'Build a pipeline that accepts PDF files, chunks documents, and creates a chatbot that can answer questions.',
	},
	{
		id: 'email-summary',
		summary: 'Summarize emails with AI',
		prompt:
			'Build a workflow that retrieves emails, performs AI analysis, and sends a summary to Slack.',
	},
];

const Template: StoryFn = (args) => ({
	setup: () => ({ args }),
	components: {
		N8nPromptInputSuggestions,
		N8nPromptInput,
	},
	template: `
		<div style="max-width: 710px; margin: 0 auto; padding: 20px;">
			<N8nPromptInputSuggestions v-bind="args">
				<template #prompt-input>
					<N8nPromptInput
						placeholder="Describe the workflow you want to build..."
						:min-lines="2"
						:streaming="args.streaming"
						:disabled="args.disabled"
						:credits-quota="args.creditsQuota"
						:credits-remaining="args.creditsRemaining"
						:show-ask-owner-tooltip="args.showAskOwnerTooltip"
						@submit="() => {}"
						@upgrade-click="() => {}"
					/>
				</template>
			</N8nPromptInputSuggestions>
		</div>
	`,
});

export const Default = Template.bind({});
Default.args = {
	suggestions: mockSuggestions,
};

export const Disabled = Template.bind({});
Disabled.args = {
	suggestions: mockSuggestions,
	disabled: true,
};

export const Streaming = Template.bind({});
Streaming.args = {
	suggestions: mockSuggestions,
	streaming: true,
};

export const NoSuggestions = Template.bind({});
NoSuggestions.args = {
	suggestions: [],
};

export const WithCredits = Template.bind({});
WithCredits.args = {
	suggestions: mockSuggestions,
	creditsQuota: 100,
	creditsRemaining: 75,
};
