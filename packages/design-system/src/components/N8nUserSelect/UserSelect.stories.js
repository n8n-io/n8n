import N8nUserSelect from './UserSelect.vue';
import { action } from '@storybook/addon-actions';

export default {
	title: 'Modules/UsersSelect',
	component: N8nUserSelect,
	argTypes: {
	},
	parameters: {
		backgrounds: { default: '--color-background-light' },
	},
};

const methods = {
	onChange: action('change'),
	onBlur: action('blur'),
	onFocus: action('focus'),
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nUserSelect,
	},
	template:
		'<n8n-user-select v-bind="$props" @change="onChange" @blur="onBlur" @focus="onFocus" />',
	methods,
});

export const UserSelect = Template.bind({});
UserSelect.args = {
	users: [
		{
			id: "1",
			firstName: 'Sunny',
			lastName: 'Side',
			email: "sunny@n8n.io",
			role: 'owner',
		},
		{
			id: "2",
			firstName: 'Kobi',
			lastName: 'Dog',
			email: "kobi@n8n.io",
			role: 'member',
		},
		{
			id: "3",
			email: "invited@n8n.io",
			role: 'member',
		},
	],
	placeholder: 'Select user to transfer to',
};
