import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';
import { ref } from 'vue';

import N8nChatRating from '../N8nChatRating/ChatRating.vue';
import N8nChatActions from './ChatActions.vue';

const meta = {
	title: 'Areas/Assistant/ChatActions',
	component: N8nChatActions,
	argTypes: {
		content: { control: 'text' },
		showCopy: { control: 'boolean' },
		showReadAloud: { control: 'boolean' },
		copyLabel: { control: 'text' },
		readAloudLabel: { control: 'text' },
		onCopy: { action: 'copy' },
		onReadAloud: { action: 'readAloud' },
	},
	parameters: {
		docs: {
			description: {
				component: 'Actions for copying or reading an assistant response aloud.',
			},
		},
	},
} satisfies Meta<typeof N8nChatActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: function render(args) {
		return {
			components: { N8nChatActions },
			setup: function setup() {
				return { args };
			},
			template: `
				<div>
					<p>{{ args.content }}</p>
					<N8nChatActions v-bind="args" />
				</div>
			`,
		};
	},
	args: {
		content: 'The workflow is ready.',
		showCopy: true,
		copyLabel: 'Copy',
		onCopy: action('copy'),
		showReadAloud: true,
		readAloudLabel: 'Read aloud',
		onReadAloud: action('readAloud'),
	},
};

export const CopyOnly: Story = {
	render: function render(args) {
		return {
			components: { N8nChatActions },
			setup: function setup() {
				return { args };
			},
			template: `
				<div>
					<p>{{ args.content }}</p>
					<N8nChatActions v-bind="args" />
				</div>
			`,
		};
	},
	args: {
		content: 'Copy this message to the clipboard.',
		showCopy: true,
		copyLabel: 'Copy',
		onCopy: action('copy'),
		showReadAloud: false,
	},
};

export const ReadAloudOnly: Story = {
	render: function render(args) {
		return {
			components: { N8nChatActions },
			setup: function setup() {
				return { args };
			},
			template: `
				<div>
					<p>{{ args.content }}</p>
					<N8nChatActions v-bind="args" />
				</div>
			`,
		};
	},
	args: {
		content: 'Read this message aloud.',
		showCopy: false,
		showReadAloud: true,
		readAloudLabel: 'Read aloud',
		onReadAloud: action('readAloud'),
	},
};

export const WithCustomActions: Story = {
	render: function render(args) {
		return {
			components: { N8nChatActions, N8nChatRating },
			setup: function setup() {
				const rating = ref<'up' | 'down'>();
				return { args, rating };
			},
			template: `
				<p>{{ args.content }}</p>
				<N8nChatActions v-bind="args">
					<N8nChatRating :rating="rating" @rate="rating = $event" />
				</N8nChatActions>
			`,
		};
	},
	args: {
		content: 'The workflow is ready.',
		showCopy: true,
		copyLabel: 'Copy',
		onCopy: action('copy'),
		showReadAloud: true,
		readAloudLabel: 'Read aloud',
		onReadAloud: action('readAloud'),
	},
};
