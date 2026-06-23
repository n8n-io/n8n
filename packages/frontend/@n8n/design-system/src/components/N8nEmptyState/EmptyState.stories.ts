import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import N8nEmptyState from './EmptyState.vue';
import N8nLink from '../N8nLink';
import N8nText from '../N8nText';

export default {
	title: 'Core/EmptyState',
	component: N8nEmptyState,
	argTypes: {
		variant: {
			control: { type: 'select' },
			options: ['empty', 'gated'],
		},
		buttonVariant: {
			control: { type: 'select' },
			options: ['solid', 'subtle', 'ghost', 'outline'],
		},
		bordered: {
			control: { type: 'boolean' },
		},
	},
	parameters: {
		docs: {
			description: {
				component:
					'An opinionated, centered, dashed-border action card used for both true empty states and gated/upgrade states (the "Landing" form factor). The anatomy is rigid (visual → title → description → actions); flexibility is only available through the listed slots.',
			},
		},
		backgrounds: { default: '--color--background--light-2' },
	},
};

const methods = {
	onClick: action('click:button'),
};

const DefaultTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nEmptyState,
	},
	template: '<n8n-empty-state v-bind="args" @click:button="onClick" />',
	methods,
});

export const SingleIcon = DefaultTemplate.bind({});
SingleIcon.args = {
	icon: 'tree-pine',
	title: 'Create your first workflow',
	description: 'Get started by creating a new workflow to automate your tasks.',
	buttonText: 'Create workflow',
	buttonIcon: 'plus',
};

export const IconCluster = DefaultTemplate.bind({});
IconCluster.args = {
	iconCluster: ['key-round', 'circle-ellipsis', 'vault'],
	title: 'Add an external secrets store',
	description:
		'Manage credentials across multiple environments by adding an external secrets store. Keep sensitive credential information in your vault for added security.',
	learnMoreUrl: 'https://docs.n8n.io/external-secrets/',
	buttonText: 'Add secrets store',
};

export const Gated = DefaultTemplate.bind({});
Gated.args = {
	variant: 'gated',
	iconCluster: ['key-round', 'circle-ellipsis', 'vault'],
	title: 'Available on the Enterprise plan',
	description:
		'Connect external secrets tools for centralized credentials management across environments, and to enhance system security.',
	learnMoreUrl: 'https://docs.n8n.io/external-secrets/',
	buttonText: 'View plans',
};

const CustomVisualTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nEmptyState,
	},
	template: `
		<n8n-empty-state v-bind="args" @click:button="onClick">
			<template #visual>
				<span style="font-size: 48px">🗝️</span>
			</template>
		</n8n-empty-state>
	`,
	methods,
});

export const CustomVisual = CustomVisualTemplate.bind({});
CustomVisual.args = {
	title: 'Bring your own illustration',
	description: 'The `visual` slot is an escape hatch that overrides the icon and icon cluster.',
	buttonText: 'Get started',
};

const DescriptionWithLinkTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nEmptyState,
		N8nText,
		N8nLink,
	},
	template: `
		<n8n-empty-state v-bind="args" @click:button="onClick">
			<template #description>
				<N8nText color="text-base">
					Manage credentials across multiple environments.
					<N8nLink href="https://docs.n8n.io/external-secrets/" :new-window="true">Read the docs</N8nLink>
				</N8nText>
			</template>
		</n8n-empty-state>
	`,
	methods,
});

export const DescriptionWithLink = DescriptionWithLinkTemplate.bind({});
DescriptionWithLink.args = {
	iconCluster: ['key-round', 'circle-ellipsis', 'vault'],
	title: 'Add an external secrets store',
	buttonText: 'Add secrets store',
};
