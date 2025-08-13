import type { StoryFn } from '@storybook/vue3';

import N8nCallout from './Callout.vue';
import N8nLink from '../N8nLink';
import N8nText from '../N8nText';

export default {
	title: 'Atoms/Callout',
	component: N8nCallout,
	argTypes: {
		theme: {
			control: {
				type: 'select',
			},
			options: ['info', 'secondary', 'success', 'warning', 'danger', 'custom'],
		},
		message: {
			control: {
				type: 'text',
			},
		},
		icon: {
			control: {
				type: 'text',
			},
		},
	},
	parameters: {
		design: {
			type: 'figma',
			url: 'https://www.figma.com/file/tPpJvbrnHbP8C496cYuwyW/Node-pinning?node-id=15%3A5777',
		},
	},
};

interface Args {
	theme: string;
	icon: string;
	default: string;
	actions: string;
	trailingContent: string;
}

const template: StoryFn<Args> = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nLink,
		N8nText,
		N8nCallout,
	},
	template: `
		<n8n-callout v-bind="args">
			${args.default}
			<template #actions v-if="args.actions">
				${args.actions}
			</template>
			<template #trailingContent v-if="args.trailingContent">
				${args.trailingContent}
			</template>
		</n8n-callout>
	`,
});

export const defaultCallout = template.bind({});
defaultCallout.args = {
	theme: 'success',
	default: `
		This is a default callout.
	`,
};

export const customCallout = template.bind({});
customCallout.args = {
	theme: 'custom',
	icon: 'git-branch',
	default: `
		This is a custom callout.
	`,
	actions: `
		<n8n-link size="small">
			Do something!
		</n8n-link>
	`,
};

export const secondaryCallout = template.bind({});
secondaryCallout.args = {
	theme: 'secondary',
	icon: 'pin',
	default: `
		This data is pinned.
	`,
	actions: `
		<n8n-link theme="secondary" size="small" :bold="true" :underline="true">
			Unpin
		</n8n-link>
	`,
	trailingContent: `
		<n8n-link
			theme="secondary"
			size="small"
			:bold="true"
			:underline="true"
			to="https://n8n.io"
		>
			Learn more
		</n8n-link>
	`,
};
