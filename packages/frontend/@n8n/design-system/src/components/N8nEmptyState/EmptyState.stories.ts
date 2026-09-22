import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';
import { markRaw, type Component } from 'vue';

import N8nEmptyState from './EmptyState.vue';
import N8nLink from '../N8nLink';
import N8nText from '../N8nText';

export default {
	title: 'Core/EmptyState',
	component: N8nEmptyState,
	argTypes: {
		calloutTheme: {
			control: {
				type: 'select',
			},
			options: ['info', 'success', 'warning', 'danger', 'custom'],
		},
	},
	parameters: {
		docs: {
			description: {
				component: 'A card-like empty-state container with title, description, and action areas.',
			},
		},
		backgrounds: { default: '--color--background--light-2' },
	},
};

const methods = {
	onClick: action('click'),
};

const DefaultTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nEmptyState,
	},
	template: '<n8n-empty-state v-bind="args" @click="onClick" />',
	methods,
});

export const EmptyState = DefaultTemplate.bind({});
EmptyState.args = {
	icon: { type: 'emoji', value: '😿' },
	heading: 'Headline you need to know',
	description:
		'Long description that you should know something is the way it is because of how it is. ',
	buttonText: 'Do something',
};

export const EmptyStateWithIcon = DefaultTemplate.bind({});
EmptyStateWithIcon.args = {
	icon: { type: 'icon', value: 'tree-pine' },
	heading: 'Create your first workflow',
	description: 'Get started by creating a new workflow to automate your tasks.',
	buttonText: 'Create Workflow',
};

// Demonstrates that the side cards accept custom Vue components alongside icon names.
const DemoBrandMark: Component = markRaw({
	name: 'DemoBrandMark',
	template: `
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style="width: 1em; height: 1em; flex: 0 0 auto;">
			<circle cx="12" cy="12" r="10" fill="#D97757" />
			<path d="M8 12h8M12 8v8" stroke="#fff" stroke-width="2" stroke-linecap="round" />
		</svg>
	`,
});

export const EmptyStateWithIconCards = DefaultTemplate.bind({});
EmptyStateWithIconCards.args = {
	icon: {
		type: 'cards',
		center: 'mcp',
		sides: [DemoBrandMark, 'code', 'terminal', 'bot', 'sparkles', 'globe'],
	},
	heading: 'Connect AI assistants to build and run workflows',
	description:
		'Let MCP clients like Claude Code and Cursor build, run, and iterate on workflows in your instance.',
	buttonText: 'Enable MCP access',
};
EmptyStateWithIconCards.parameters = {
	docs: {
		description: {
			story:
				'The `cards` icon variant renders a fanned trio of bordered cards above the heading: the raised centre card carries the static icon of the feature or settings page the empty state belongs to (`center`), while the two tilted side cards cycle through `sides` with a staggered fade+blur swap. Side icons accept registered icon names, any Lucide icon name, or custom Vue components (e.g. inlined brand marks) — this story mixes a custom SVG mark with built-in icons. Cycling is skipped when fewer than three side icons are provided or when the user prefers reduced motion.',
		},
	},
};

export const EmptyStateWithStaticIconCards = DefaultTemplate.bind({});
EmptyStateWithStaticIconCards.args = {
	icon: {
		type: 'cards',
		center: 'mcp',
		sides: ['code', 'terminal'],
		animated: false,
	},
	heading: 'Connect AI assistants to build and run workflows',
	description:
		'Let MCP clients like Claude Code and Cursor build, run, and iterate on workflows in your instance.',
	buttonText: 'Enable MCP access',
};
EmptyStateWithStaticIconCards.parameters = {
	docs: {
		description: {
			story:
				'`animated: false` renders the same card trio statically: the centre icon flanked by the first two side icons, with no cycling. Use this when the surrounding page already carries enough motion, or when the side icons are fixed rather than an open-ended set.',
		},
	},
};

const WithAdditionalContentTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nEmptyState,
		N8nText,
		N8nLink,
	},
	template: `
		<n8n-empty-state v-bind="args" @click="onClick">
			<template #additionalContent>
					<N8nText color="text-base">
						Read more on
					</N8nText>
					<N8nLink class="ml-4xs" href="https://n8n.io" target="_blank">our docs</N8nLink>
			</template>
		</n8n-empty-state>
	`,
	methods,
});

export const EmptyStateWithAdditionalContent = WithAdditionalContentTemplate.bind({});
EmptyStateWithAdditionalContent.args = {
	icon: { type: 'emoji', value: '🚀' },
	heading: 'Launch your project',
	description:
		'Get started with your project by clicking the button below. Additional content is included.',
	buttonText: 'Get Started',
};
