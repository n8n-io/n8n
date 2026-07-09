import type { StoryFn } from '@storybook/vue3-vite';
import { ref } from 'vue';

import N8nAiTraceChips from './AiTraceChips.vue';
import type { AiTraceChipItem } from './types';

export default {
	title: 'Assistant/AiTraceChips',
	component: N8nAiTraceChips,
	parameters: {
		docs: {
			description: {
				component:
					'Horizontal strip of icon chips representing agent trace steps. Hover shows the full label, click expands a shared detail panel below the strip — one chip per strip at a time.',
			},
		},
	},
};

const items: AiTraceChipItem[] = [
	{ id: 'skill-1', icon: 'book-open', label: 'Opening skill' },
	{ id: 'skill-2', icon: 'book-open', label: 'Opening skill' },
	{ id: 'tables', icon: 'table', label: 'Listing data tables' },
	{ id: 'schema', icon: 'workflow', label: 'Loading node schema' },
	{ id: 'credentials', icon: 'key-round', label: 'Checking credentials' },
	{ id: 'unknown', icon: 'wrench', label: 'Running tool' },
];

export const Default: StoryFn = () => ({
	components: { N8nAiTraceChips },
	setup() {
		const expandedId = ref<string | null>(null);
		return { items, expandedId };
	},
	template: `
		<div style="max-width: 720px; padding: var(--spacing--md);">
			<n8n-ai-trace-chips v-model:expanded-id="expandedId" :items="items">
				<template #panel="{ item }">
					<div style="font-size: var(--font-size--sm); color: var(--color--text--tint-1);">
						Detail panel for “{{ item.label }}” ({{ item.id }})
					</div>
				</template>
			</n8n-ai-trace-chips>
		</div>
	`,
});

export const WithRunningAndError: StoryFn = () => ({
	components: { N8nAiTraceChips },
	setup() {
		const expandedId = ref<string | null>(null);
		const mixed: AiTraceChipItem[] = [
			{ id: 'reasoning', icon: 'brain', label: 'Reasoning' },
			{ id: 'schema', icon: 'workflow', label: 'Loading node schema' },
			{
				id: 'failed',
				icon: 'wrench',
				label: 'Run command',
				error: 'Command failed with exit code 2.',
			},
			{ id: 'building', icon: 'workflow', label: 'Generating workflow', loading: true },
		];
		return { mixed, expandedId };
	},
	template: `
		<div style="max-width: 720px; padding: var(--spacing--md);">
			<n8n-ai-trace-chips v-model:expanded-id="expandedId" :items="mixed">
				<template #panel="{ item }">
					<div style="font-size: var(--font-size--sm); color: var(--color--text--tint-1);">
						Detail panel for “{{ item.label }}”
					</div>
				</template>
			</n8n-ai-trace-chips>
		</div>
	`,
});
