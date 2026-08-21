import type { StoryFn } from '@storybook/vue3-vite';

import ToolMessage from './ToolMessage.vue';
import type { ChatUI } from '../../../types/assistant';

export default {
	title: 'Areas/Assistant/ToolMessage',
	component: ToolMessage,
	parameters: {
		docs: {
			description: {
				component: 'A tool-call status row in Assistant chat.',
			},
		},
	},
};

const Template: StoryFn = (args) => ({
	setup: () => ({ args }),
	components: { ToolMessage },
	template: `
		<div style="width: 380px;">
			<ToolMessage v-bind="args" />
		</div>
	`,
});

const toolMessage = (
	overrides: Partial<ChatUI.ToolMessage> & { id?: string; read?: boolean } = {},
): ChatUI.ToolMessage & { id: string; read: boolean } => ({
	id: 'tool-1',
	role: 'assistant',
	type: 'tool',
	toolName: 'search_files',
	toolCallId: 'call_456',
	displayTitle: 'Search Files',
	status: 'completed',
	updates: [],
	read: false,
	...overrides,
});

export const Completed = Template.bind({});
Completed.args = {
	isFirstOfRole: true,
	user: { firstName: 'Max', lastName: 'Test' },
	message: toolMessage({ status: 'completed' }),
};

export const Running = Template.bind({});
Running.args = {
	isFirstOfRole: true,
	user: { firstName: 'Max', lastName: 'Test' },
	message: toolMessage({
		id: 'tool-2',
		status: 'running',
		toolName: 'code_tool',
		displayTitle: 'Code Tool',
	}),
};

export const Error = Template.bind({});
Error.args = {
	isFirstOfRole: true,
	user: { firstName: 'Max', lastName: 'Test' },
	message: toolMessage({
		id: 'tool-3',
		status: 'error',
		toolName: 'database_query',
		displayTitle: 'Database Query',
	}),
};
