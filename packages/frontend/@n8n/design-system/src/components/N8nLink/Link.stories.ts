import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import N8nLink from './Link.vue';

export default {
	title: 'Core/Link',
	component: N8nLink,
	argTypes: {
		size: {
			control: {
				type: 'select',
			},
			options: ['small', 'medium', 'large'],
		},
	},

	parameters: {
		docs: {
			description: { component: 'A text link component for navigation and inline actions.' },
		},
	},
};

const methods = {
	onClick: action('click'),
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nLink,
	},
	template: '<n8n-link v-bind="args" @click="onClick">hello world</n8n-link>',
	methods,
});

export const Default = Template.bind({});
Default.args = {
	href: 'https://n8n.io/',
};

export const Sizes: StoryFn = () => ({
	components: { N8nLink },
	template: `
		<div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
			<n8n-link href="https://n8n.io/" size="small">Small</n8n-link>
			<n8n-link href="https://n8n.io/" size="medium">Medium</n8n-link>
			<n8n-link href="https://n8n.io/" size="large">Large</n8n-link>
		</div>
	`,
});

export const Variants: StoryFn = () => ({
	components: { N8nLink },
	template: `
		<div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
			<n8n-link href="https://n8n.io/" theme="primary">Primary</n8n-link>
			<n8n-link href="https://n8n.io/" theme="secondary">Secondary</n8n-link>
			<n8n-link href="https://n8n.io/" theme="text">Text</n8n-link>
			<n8n-link href="https://n8n.io/" theme="danger">Danger</n8n-link>
		</div>
	`,
});
