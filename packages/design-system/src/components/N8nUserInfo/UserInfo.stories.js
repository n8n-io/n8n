import N8nUserInfo from './UserInfo.vue';

export default {
	title: 'Atoms/UserInfo',
	component: N8nUserInfo,
	parameters: {
		backgrounds: { default: '--color-background-light' },
	},
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nUserInfo,
	},
	template:
		'<n8n-user-info v-bind="$props" />',
});

export const Member = Template.bind({});
Member.args = {
	user: {
		id: "1",
		firstName: "M",
		lastName: "A",
		email: 'test@n8n.io',
	},
};

export const Current = Template.bind({});
Current.args = {
	user: {
		id: "1",
		firstName: "M",
		lastName: "A",
		email: 'test@n8n.io',
	},
	currentUserId: "1",
};

export const Invited = Template.bind({});
Invited.args = {
	user: {
		id: "1",
		email: 'test@n8n.io',
	},
};
