import type { StoryFn } from '@storybook/vue3-vite';

import N8nAvatar from './Avatar.vue';

export default {
	title: 'Atoms/Avatar',
	component: N8nAvatar,
	argTypes: {
		size: {
			type: 'select',
			options: ['small', 'medium', 'large'],
		},
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nAvatar,
	},
	template: '<n8n-avatar v-bind="args" />',
});

export const Avatar = Template.bind({});
Avatar.args = {
	firstName: 'Sunny',
	lastName: 'Side',
};
