import N8nActionBox from './ActionBox.vue';
import { action } from '@storybook/addon-actions';

export default {
	title: 'Atoms/ActionBox',
	component: N8nActionBox,
	argTypes: {
	},
	parameters: {
		backgrounds: { default: '--color-background-light' },
	},
};

const methods = {
	onClick: action('click'),
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nActionBox,
	},
	template: '<n8n-action-box v-bind="$props" @click="onClick" />',
	methods,
});

export const ActionBox = Template.bind({});
ActionBox.args = {
	emoji: "😿",
	heading= "You’re missing out on user management",
	description= "Set up an owner account in order to invite other users. Once set up, each user will need to use a password to access this instance.",
	buttonText= "Set up my owner account",
};
