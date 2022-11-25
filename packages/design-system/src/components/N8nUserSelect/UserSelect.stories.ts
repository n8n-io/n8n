import N8nUserSelect from './UserSelect.vue';
import { action } from '@storybook/addon-actions';
import type { StoryFn } from '@storybook/vue';

export default {
	title: 'Modules/UserSelect',
	component: N8nUserSelect,
	argTypes: {},
	parameters: {
		backgrounds: { default: '--color-background-light' },
	},
};

const methods = {
	onChange: action('change'),
	onBlur: action('blur'),
	onFocus: action('focus'),
};

const Template: StoryFn = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nUserSelect,
	},
	template:
		'<n8n-user-select v-bind="$props" v-model="val" @change="onChange" @blur="onBlur" @focus="onFocus" />',
	methods,
	data() {
		return {
			val: '',
		};
	},
});

export const UserSelect = Template.bind({});
UserSelect.args = {
	users: [
		{
			id: '1',
			firstName: 'Sunny',
			lastName: 'Side',
			email: 'sunny@n8n.io',
			globalRole: {
				name: 'owner',
				id: '1',
			},
		},
		{
			id: '2',
			firstName: 'Kobi',
			lastName: 'Dog',
			email: 'kobi@n8n.io',
			globalRole: {
				name: 'member',
				id: '2',
			},
		},
		{
			id: '3',
			email: 'invited@n8n.io',
			globalRole: {
				name: 'member',
				id: '2',
			},
		},
	],
	placeholder: 'Select user to transfer to',
	currentUserId: '1',
};
