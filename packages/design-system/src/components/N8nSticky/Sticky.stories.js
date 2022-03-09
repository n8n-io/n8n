import {action} from '@storybook/addon-actions';
import N8nSticky from './Sticky.vue';

export default {
	title: 'Atoms/Sticky',
	component: N8nSticky,
	argTypes: {
		content: {
			control: {
				control: 'text',
			},
		},
		height: {
			control: {
				control: 'number',
			}
		},
		readOnly: {
			control: {
				control: 'Boolean',
			},
		},
		width: {
			control: {
				control: 'number',
			}
		},
	},
};

const methods = {
	onBlur: action('blur'),
	onChange: action('change'),
	onFocus: action('focus'),
	onInput: action('input'),
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nSticky,
	},
	template:
		'<n8n-sticky v-bind="$props"  @blur="onBlur" @change="onChange" @focus="onFocus" @input="onInput"></n8n-sticky>',
	methods,
});

export const Sticky = Template.bind({});
Sticky.args = {
	content: '## I am a heading.\nThis is how you **bold** text and this is how you create an [inline link](https://n8n.io/)',
	readOnly: false,
	width: 220,
	height: 160,
};
