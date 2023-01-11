import N8nUsersList from './UsersList.vue';
import { action } from '@storybook/addon-actions';
import type { StoryFn } from '@storybook/vue';
import { IUser } from '@/types';

export default {
	title: 'Modules/UsersList',
	component: N8nUsersList,
	argTypes: {},
	parameters: {
		backgrounds: { default: '--color-background-light' },
	},
};

const methods = {
	onReinvite: action('reinvite'),
	onDelete: action('delete'),
};

const Template: StoryFn = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nUsersList,
	},
	template:
		'<n8n-users-list v-bind="$props" :actions="actions" @reinvite="onReinvite" @delete="onDelete" />',
	methods,
});

export const UsersList = Template.bind({});
UsersList.args = {
	actions: [
		{
			label: 'Resend Invite',
			value: 'reinvite',
			guard: (user: IUser) => !user.firstName,
		},
		{
			label: 'Delete User',
			value: 'delete',
		},
	],
	users: [
		{
			id: '1',
			firstName: 'Sunny',
			lastName: 'Side',
			fullName: 'Sunny Side',
			email: 'sunny@n8n.io',
			isDefaultUser: false,
			isPendingUser: false,
			isOwner: true,
			globalRole: {
				name: 'owner',
				id: 1,
			},
		},
		{
			id: '2',
			firstName: 'Kobi',
			lastName: 'Dog',
			fullName: 'Kobi Dog',
			email: 'kobi@n8n.io',
			isDefaultUser: false,
			isPendingUser: false,
			isOwner: false,
			globalRole: {
				name: 'member',
				id: '2',
			},
		},
		{
			id: '3',
			email: 'invited@n8n.io',
			isDefaultUser: false,
			isPendingUser: true,
			isOwner: false,
			globalRole: {
				name: 'member',
				id: '2',
			},
		},
	],
	currentUserId: '1',
};
