import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';
import { ref } from 'vue';

import N8nTabs from './Tabs.vue';
import type { TabOptions } from '../../types/tabs';

export default {
	title: 'Core/Tabs',
	component: N8nTabs,
	argTypes: {
		variant: {
			control: 'select',
			options: ['underline', 'filled'],
		},
		size: {
			control: 'select',
			options: ['small', 'medium', 'large'],
		},
		orientation: {
			control: 'select',
			options: ['horizontal', 'vertical'],
		},
		justified: {
			control: 'boolean',
		},
	},
	parameters: {
		docs: {
			description: {
				component: 'A tab navigation component for switching between content panels.',
			},
		},
		backgrounds: { default: '--color--background--light-3' },
	},
};

type DefaultTab = 'overview' | 'usage' | 'accessibility';

const defaultTabs: Array<TabOptions<DefaultTab>> = [
	{ label: 'Overview', value: 'overview' },
	{ label: 'Usage', value: 'usage' },
	{ label: 'Accessibility', value: 'accessibility' },
];

export const Default: StoryFn = (args) => ({
	components: { N8nTabs },
	setup() {
		const val = ref<DefaultTab>('overview');
		return { args, val, options: defaultTabs };
	},
	methods: {
		onUpdateModelValue: action('update:modelValue'),
	},
	template: `
		<n8n-tabs
			v-model="val"
			:options="options"
			:variant="args.variant"
			:size="args.size"
			:orientation="args.orientation"
			:justified="args.justified"
			@update:model-value="onUpdateModelValue"
		>
			<template #content="{ value }">
				<p v-if="value === 'overview'" style="padding: var(--spacing--sm);">
					Tabs let users switch between related views without leaving the page.
					Each tab shows one view at a time.
				</p>
				<p v-else-if="value === 'usage'" style="padding: var(--spacing--sm);">
					Use tabs for content at the same level of hierarchy.
					Keep labels short, and do not use more tabs than fit in one row.
				</p>
				<p v-else style="padding: var(--spacing--sm);">
					Use the arrow keys to move between tabs.
					Press Enter or Space to select the focused tab.
				</p>
			</template>
		</n8n-tabs>
	`,
});
Default.args = {
	variant: 'underline',
	size: 'medium',
	orientation: 'horizontal',
	justified: false,
};
