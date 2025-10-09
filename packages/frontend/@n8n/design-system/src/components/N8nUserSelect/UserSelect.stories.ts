import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import N8nUserSelect from './UserSelect.vue';

export default {
	title: 'Modules/UserSelect',
	component: N8nUserSelect,
	argTypes: {},
	parameters: {
		backgrounds: { default: '--color--background--light-2' },
	},
};

const methods = {
	onChange: action('change'),
	onBlur: action('blur'),
	onFocus: action('focus'),
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nUserSelect,
	},
	template:
		'<n8n-user-select v-bind="args" v-model="val" @change="onChange" @blur="onBlur" @focus="onFocus" />',
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
		},
		{
			id: '2',
			firstName: 'Kobi',
			lastName: 'Dog',
			email: 'kobi@n8n.io',
		},
		{
			id: '3',
			email: 'invited@n8n.io',
		},
	],
	placeholder: 'Select user to transfer to',
	currentUserId: '1',
};
