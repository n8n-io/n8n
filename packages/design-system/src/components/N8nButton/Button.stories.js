import N8nButton from './Button.vue';
import { action } from '@storybook/addon-actions';

export default {
	title: 'Atoms/Button',
	component: N8nButton,
	argTypes: {
		label: {
			control: 'text',
		},
		title: {
			control: 'text',
		},
		type: {
			control: 'select',
			options: ['primary', 'outline', 'light', 'text'],
		},
		size: {
			control: {
				type: 'select',
				options: ['mini', 'small', 'medium', 'large', 'xlarge'],
			},
		},
		loading: {
			control: {
				type: 'boolean',
			},
		},
		icon: {
			control: {
				type: 'text',
			},
		},
		circle: {
			control: {
				type: 'boolean',
			},
		},
		fullWidth: {
			type: 'boolean',
		},
		theme: {
			type: 'select',
			options: ['success', 'danger', 'warning'],
		},
		float: {
			type: 'select',
			options: ['left', 'right'],
		},
	},
	parameters: {
		design: {
			type: 'figma',
			url: 'https://www.figma.com/file/DxLbnIyMK8X0uLkUguFV4n/n8n-design-system_v1?node-id=5%3A1147',
		},
	},
};

const methods = {
	onClick: action('click'),
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nButton,
	},
	template: '<n8n-button v-bind="$props" @click="onClick" />',
	methods,
});

export const Button = Template.bind({});
Button.args = {
	label: 'Button',
};

const ManyTemplate = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nButton,
	},
	template:
		'<div> <n8n-button v-bind="$props" size="large" @click="onClick" />  <n8n-button v-bind="$props" size="medium" @click="onClick" />  <n8n-button v-bind="$props" size="small" @click="onClick" />  <n8n-button v-bind="$props" :loading="true" @click="onClick" />  <n8n-button v-bind="$props" :disabled="true" @click="onClick" /></div>',
	methods,
});

export const Primary = ManyTemplate.bind({});
Primary.args = {
	type: 'primary',
	label: 'Button',
};

export const Outline = ManyTemplate.bind({});
Outline.args = {
	type: 'outline',
	label: 'Button',
};

export const Light = ManyTemplate.bind({});
Light.args = {
	type: 'light',
	label: 'Button',
};

export const WithIcon = ManyTemplate.bind({});
WithIcon.args = {
	label: 'Button',
	icon: 'plus-circle',
};

export const Text = ManyTemplate.bind({});
Text.args = {
	type: 'text',
	label: 'Button',
	icon: 'plus-circle',
};
