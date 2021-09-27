import N8nAvatar from './Avatar.vue';
import { action } from '@storybook/addon-actions';

export default {
	title: 'Atoms/Avatar',
	component: N8nAvatar,
	argTypes: {
		size: {
			type: 'select',
			options: ['medium', 'large'],
		},
	},
};

const methods = {
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nAvatar,
	},
	template: '<n8n-avatar v-bind="$props" />',
	methods,
});

export const Avatar = Template.bind({});
Avatar.args = {
	firstName: 'Mutasem',
	lastName: 'Aldmour',
};
