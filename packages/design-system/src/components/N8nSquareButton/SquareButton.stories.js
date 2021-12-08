import N8nSquareButton from './SquareButton.vue';
import { action } from '@storybook/addon-actions';

export default {
	title: 'Atoms/SquareButton',
	component: N8nSquareButton,
	argTypes: {
		bold: {
			control: {
				type: 'boolean',
			},
		},
		color: {
			control: {
				type: 'select',
				options: ['primary', 'background-dark', 'text-dark', 'text-base', 'text-light', 'text-xlight'],
			},
		},
		label: {
			control: 'text',
		},
		size: {
			control: {
				type: 'select',
				options: ['mini', 'small', 'medium', 'large', 'xlarge'],
			},
		},
	},
};

const methods = {
	onClick: action('click'),
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nSquareButton,
	},
	template: '<n8n-square-button v-bind="$props" @click="onClick"></n8n-square-button>',
	methods,
});

export const SquareButton = Template.bind({});
