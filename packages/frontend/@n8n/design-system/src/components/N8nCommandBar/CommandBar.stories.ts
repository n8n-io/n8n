import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';
import { computed, ref } from 'vue';

import N8nCommandBar from './CommandBar.vue';
import type { CommandBarItem, CommandBarSection, CommandBarTab } from './types';

const tabs: CommandBarTab[] = [
	{ id: 'all', label: 'All' },
	{ id: 'workflows', label: 'Workflows' },
	{ id: 'projects', label: 'Projects' },
	{ id: 'actions', label: 'Actions' },
];

const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

const workflows: CommandBarItem[] = [
	{
		id: 'workflow-1',
		title: 'Sync leads to HubSpot',
		description: 'Sales / Production',
		descriptionIcon: { type: 'icon', value: 'layers' },
		icon: { type: 'icon', value: 'workflow' },
		timestamp: twoHoursAgo,
		href: '#workflow-1',
	},
	{
		id: 'workflow-2',
		title: 'Archive invoices',
		description: 'Personal',
		descriptionIcon: { type: 'icon', value: 'user' },
		icon: { type: 'icon', value: 'workflow' },
		timestamp: lastWeek,
		href: '#workflow-2',
	},
];

const projects: CommandBarItem[] = [
	{ id: 'project-1', title: 'Sales', icon: { type: 'emoji', value: '💼' }, href: '#project-1' },
	{ id: 'project-2', title: 'Support', icon: { type: 'icon', value: 'layers' } },
];

const actions: CommandBarItem[] = [
	{
		id: 'create-workflow',
		title: 'Create workflow',
		icon: { type: 'icon', value: 'plus' },
		section: 'Actions',
	},
	{
		id: 'execute-workflow',
		title: 'Execute workflow',
		icon: { type: 'icon', value: 'flask-conical' },
		shortcut: { metaKey: true, keys: ['↵'] },
		section: 'Actions',
	},
	{
		id: 'publish-workflow',
		title: 'Publish workflow',
		icon: { type: 'icon', value: 'circle-check' },
		section: 'Actions',
		disabled: true,
	},
	{
		id: 'open-sub-workflow',
		title: 'Open sub-workflow',
		icon: { type: 'icon', value: 'arrow-right' },
		section: 'Actions',
		children: workflows,
	},
];

function matches(item: CommandBarItem, query: string) {
	return item.title.toLowerCase().includes(query.trim().toLowerCase());
}

export default {
	title: 'Core/CommandBar',
	component: N8nCommandBar,
	parameters: {
		docs: {
			description: {
				component:
					'A command palette with type tabs, grouped results, keyboard navigation and paging. The parent owns search: it passes the sections to show and reacts to the emitted events.',
			},
		},
	},
};

export const Default: StoryFn = () => ({
	components: { N8nCommandBar },
	setup() {
		const open = ref(true);
		const query = ref('');
		const activeTab = ref('all');
		const scope = ref<CommandBarItem>();

		const sections = computed<CommandBarSection[]>(() => {
			if (scope.value) {
				return [
					{
						id: 'scope',
						items: (scope.value.children ?? []).filter((item) => matches(item, query.value)),
					},
				];
			}
			const all: CommandBarSection[] = [
				{ id: 'workflows', title: 'Workflows', items: workflows },
				{ id: 'projects', title: 'Projects', items: projects },
				{ id: 'actions', title: 'Actions', items: actions },
			];
			return all
				.filter((section) => activeTab.value === 'all' || section.id === activeTab.value)
				.map((section) => ({
					...section,
					items: section.items.filter((item) => matches(item, query.value)),
				}));
		});

		function onSelect(item: CommandBarItem) {
			action('select')(item);
			if (item.children) {
				scope.value = item;
				query.value = '';
			}
		}

		function onBack() {
			scope.value = undefined;
			query.value = '';
		}

		return { open, query, activeTab, tabs, sections, scope, onSelect, onBack };
	},
	template: `
		<div>
			<button @click="open = true">Open (or press Cmd/Ctrl + K)</button>
			<n8n-command-bar
				v-model:open="open"
				v-model:query="query"
				v-model:active-tab="activeTab"
				:tabs="tabs"
				:sections="sections"
				:breadcrumb="scope?.title"
				@select="onSelect"
				@back="onBack"
			/>
		</div>
	`,
});

export const Loading: StoryFn = () => ({
	components: { N8nCommandBar },
	setup: () => ({
		tabs,
		sections: [
			{ id: 'workflows', title: 'Workflows', items: [], isLoading: true },
			{ id: 'projects', title: 'Projects', items: projects, isLoading: true },
		],
	}),
	template: `
		<n8n-command-bar
			:open="true"
			query="sales"
			active-tab="all"
			:tabs="tabs"
			:sections="sections"
			:is-loading="true"
		/>
	`,
});

export const EmptyTab: StoryFn = () => ({
	components: { N8nCommandBar },
	setup: () => ({ tabs }),
	template: `
		<n8n-command-bar
			:open="true"
			query="missing"
			active-tab="workflows"
			:tabs="tabs"
			:sections="[]"
		/>
	`,
});
