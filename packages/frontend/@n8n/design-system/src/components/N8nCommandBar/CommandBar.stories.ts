import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import N8nCommandBar from './CommandBar.vue';

const sampleItems = [
	// Ungrouped items (appear first)
	{
		id: 'recent-workflow-1',
		title: 'Recent: Customer Sync',
		icon: { html: '📋' },
		handler: () => console.log('Opening recent workflow'),
	},
	{
		id: 'recent-workflow-2',
		title: 'Recent: Email Campaign',
		icon: { html: '✉️' },
		handler: () => console.log('Opening recent workflow'),
	},

	// Actions section
	{
		id: 'create-workflow',
		title: 'Create new workflow',
		icon: { html: '⚡' },
		section: 'Actions',
		handler: () => console.log('Creating new workflow'),
	},
	{
		id: 'import-workflow',
		title: 'Import workflow',
		icon: { html: '📥' },
		section: 'Actions',
		keywords: ['upload', 'file'],
		handler: () => console.log('Importing workflow'),
	},
	{
		id: 'duplicate-workflow',
		title: 'Duplicate current workflow',
		icon: { html: '📋' },
		section: 'Actions',
		handler: () => console.log('Duplicating workflow'),
	},

	// Navigation section
	{
		id: 'workflows',
		title: 'All Workflows',
		icon: { html: '📁' },
		section: 'Navigation',
		handler: () => console.log('Opening workflows'),
	},
	{
		id: 'executions',
		title: 'Executions',
		icon: { html: '🏃' },
		section: 'Navigation',
		handler: () => console.log('Opening executions'),
	},
	{
		id: 'credentials',
		title: 'Credentials',
		icon: { html: '🔑' },
		section: 'Navigation',
		handler: () => console.log('Opening credentials'),
	},

	// Tools section
	{
		id: 'search-nodes',
		title: 'Search nodes',
		icon: { html: '🔍' },
		keywords: ['node', 'add', 'integration'],
		section: 'Tools',
	},
	{
		id: 'test-webhook',
		title: 'Test webhook',
		icon: { html: '🌐' },
		section: 'Tools',
		handler: () => console.log('Testing webhook'),
	},

	// Settings section
	{
		id: 'settings',
		title: 'Settings',
		icon: {
			html: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/><path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z"/></svg>',
		},
		section: 'Settings',
		handler: () => console.log('Opening settings'),
	},
	{
		id: 'help',
		title: 'Help & Documentation',
		icon: { html: '❓' },
		section: 'Settings',
		handler: () => console.log('Opening help'),
	},
];

export default {
	title: 'Molecules/CommandBar',
	component: N8nCommandBar,
	argTypes: {
		placeholder: {
			control: 'text',
		},
		context: {
			control: 'text',
		},
		items: {
			control: 'object',
		},
	},
	parameters: {
		backgrounds: { default: '--color--background--light-2' },
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nCommandBar,
	},
	template:
		'<n8n-command-bar v-bind="args" @input-change="onInputChange" @navigate-to="onNavigateTo" @load-more="onLoadMore" />',
	methods: {
		onInputChange: action('input-change'),
		onNavigateTo: action('navigate-to'),
		onLoadMore: action('load-more'),
	},
});

export const Default = Template.bind({});
Default.args = {
	placeholder: 'Type a command...',
	items: [],
};

export const WithItems = Template.bind({});
WithItems.args = {
	placeholder: 'Search commands...',
	items: sampleItems,
};

export const WithContext = Template.bind({});
WithContext.args = {
	placeholder: 'Search for anything...',
	context: 'Workflow Editor',
	items: sampleItems,
};

export const CustomPlaceholder = Template.bind({});
CustomPlaceholder.args = {
	placeholder: 'What would you like to do?',
	items: sampleItems,
};

export const KeyboardShortcut: StoryFn = () => ({
	components: {
		N8nCommandBar,
	},
	data: () => ({
		items: sampleItems,
	}),
	template: `
		<div>
			<p style="margin-bottom: 20px; color: var(--color--text);">
				Press <kbd style="background: var(--color--background); padding: 2px 6px; border-radius: 3px;">⌘ + K</kbd>
				or <kbd style="background: var(--color--background); padding: 2px 6px; border-radius: 3px;">Ctrl + K</kbd>
				to open the command bar. Use arrow keys to navigate and Enter to select.
			</p>
			<n8n-command-bar
				placeholder="Try pressing Cmd/Ctrl + K!"
				:items="items"
				@input-change="onInputChange"
				@navigate-to="onNavigateTo"
				@load-more="onLoadMore"
			/>
		</div>
	`,
	methods: {
		onInputChange: action('input-change'),
		onNavigateTo: action('navigate-to'),
		onLoadMore: action('load-more'),
	},
});

export const SectionGrouping: StoryFn = () => ({
	components: {
		N8nCommandBar,
	},
	data: () => ({
		items: sampleItems,
	}),
	template: `
		<div>
			<p style="margin-bottom: 20px; color: var(--color--text);">
				This example shows how items are grouped by sections:
				<br/>• <strong>Recent items</strong> (no section) appear first
				<br/>• Then items are grouped by <strong>Actions</strong>, <strong>Navigation</strong>, <strong>Tools</strong>, and <strong>Settings</strong> sections
			</p>
			<n8n-command-bar
				placeholder="Search commands... (sections will be grouped)"
				:items="items"
				@input-change="onInputChange"
				@navigate-to="onNavigateTo"
				@load-more="onLoadMore"
			/>
		</div>
	`,
	methods: {
		onInputChange: action('input-change'),
		onNavigateTo: action('navigate-to'),
		onLoadMore: action('load-more'),
	},
});
