import N8nLink from './Link.vue';
import { action } from '@storybook/addon-actions';
import type { StoryFn } from '@storybook/vue3';

export default {
	title: 'Atoms/Link',
	component: N8nLink,
	argTypes: {
		size: {
			control: {
				type: 'select',
			},
			options: ['small', 'medium', 'large'],
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

export const Link = Template.bind({});
Link.args = {
	href: 'https://n8n.io/',
};
