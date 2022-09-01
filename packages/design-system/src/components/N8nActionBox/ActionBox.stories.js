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
	heading: "Headline you need to know",
	description: "Long description that you should know something is the way it is because of how it is. ",
	buttonText: "Do something",
};
