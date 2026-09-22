import type { StoryFn } from '@storybook/vue3-vite';

import N8nExternalLink from './ExternalLink.vue';

export default {
	title: 'Core/ExternalLink',
	component: N8nExternalLink,
	argTypes: {
		size: {
			control: 'select',
			options: ['small', 'medium', 'large'],
		},
		newWindow: {
			control: 'boolean',
		},
	},

	parameters: {
		docs: {
			description: {
				component: 'A link component for external destinations with external-link affordances.',
			},
		},
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nExternalLink,
	},
	template: '<N8nExternalLink v-bind="args">{{ args.default }}</N8nExternalLink>',
});

export const Default = Template.bind({});
Default.args = {
	href: 'https://n8n.io',
	size: 'medium',
	newWindow: true,
	default: 'Visit n8n',
};

export const IconOnly = Template.bind({});
IconOnly.args = {
	href: 'https://n8n.io',
	size: 'medium',
	newWindow: true,
};

export const Sizes: StoryFn = () => ({
	components: { N8nExternalLink },
	template: `
		<div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
			<N8nExternalLink href="https://n8n.io" size="small">Small</N8nExternalLink>
			<N8nExternalLink href="https://n8n.io" size="medium">Medium</N8nExternalLink>
			<N8nExternalLink href="https://n8n.io" size="large">Large</N8nExternalLink>
		</div>
	`,
});

export const SameWindow = Template.bind({});
SameWindow.args = {
	href: 'https://n8n.io',
	size: 'medium',
	newWindow: false,
	default: 'Visit n8n',
};

export const WithClickHandler = Template.bind({});
WithClickHandler.args = {
	size: 'medium',
	onClick: () => alert('Clicked!'),
	default: 'Click me',
};
