import N8nCallout from './Callout.vue';
import { StoryFn } from '@storybook/vue';
import N8nLink from '../N8nLink';
import N8nText from '../N8nText';

export default {
	title: 'Atoms/Callout',
	component: N8nCallout,
	argTypes: {
		theme: {
			control: {
				type: 'select',
				options: ['info', 'secondary', 'success', 'warning', 'danger', 'custom'],
			},
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

const template: StoryFn = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nLink,
		N8nText,
		N8nCallout,
	},
	template: `
		<n8n-callout v-bind="$props">
			${args.default}
			<template #actions v-if="actions">
				${args.actions}
			</template>
			<template #trailingContent v-if="trailingContent">
				${args.trailingContent}
			</template>
		</n8n-callout>
	`,
});

export const customCallout = template.bind({});
customCallout.args = {
	theme: 'custom',
	icon: 'code-branch',
	default: `
		<n8n-text
			size="small"
		>
			This is a callout.
		</n8n-text>
	`,
	actions: `
		<n8n-link
			size="small"
		>
			Do something!
		</n8n-link>
	`,
};

export const secondaryCallout = template.bind({});
secondaryCallout.args = {
	theme: 'secondary',
	icon: 'thumbtack',
	default: `
		<n8n-text
			size="small"
			:bold="true"
		>
			This data is pinned.
		</n8n-text>
	`,
	actions: `
		<n8n-link
			theme="secondary"
			size="small"
			:bold="true"
		>
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
