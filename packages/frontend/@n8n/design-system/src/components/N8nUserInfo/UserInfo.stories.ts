import type { StoryFn } from '@storybook/vue3-vite';

import N8nUserInfo from './UserInfo.vue';

export default {
	title: 'Modules/UserInfo',
	component: N8nUserInfo,
	parameters: {
		backgrounds: { default: '--color-background-light' },
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nUserInfo,
	},
	template: '<n8n-user-info v-bind="args" />',
});

export const Member = Template.bind({});
Member.args = {
	firstName: 'Oscar',
	lastName: 'Wilde',
	email: 'test@n8n.io',
};

export const Current = Template.bind({});
Current.args = {
	firstName: 'Ham',
	lastName: 'Sam',
	email: 'test@n8n.io',
	isCurrentUser: true,
};

export const Invited = Template.bind({});
Invited.args = {
	email: 'test@n8n.io',
	isPendingUser: true,
};
