import N8nUsersList from './UsersList.vue';
import { action } from '@storybook/addon-actions';

export default {
	title: 'Modules/UsersList',
	component: N8nUsersList,
	argTypes: {
	},
	parameters: {
		backgrounds: { default: '--color-background-light' },
	},
};

const methods = {
	onReinvite: action('reinvite'),
	onDelete: action('delete'),
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nUsersList,
	},
	template:
		'<n8n-users-list v-bind="$props" @reinvite="onReinvite" @delete="onDelete" />',
	methods,
});

export const UsersList = Template.bind({});
UsersList.args = {
	users: [
		{
			id: "1",
			firstName: 'Mutasem',
			lastName: 'Aldmour',
			email: "mutasem@n8n.io",
			role: 'owner',
		},
		{
			id: "2",
			firstName: 'Max',
			lastName: 'Tkacz',
			email: "max@n8n.io",
			role: 'member',
		},
		{
			id: "3",
			email: "invited@n8n.io",
			role: 'member',
		},
	],
	currentUserId: "1",
};
