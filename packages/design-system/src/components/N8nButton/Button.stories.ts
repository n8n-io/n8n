import N8nButton from './Button.vue';
import { action } from '@storybook/addon-actions';
import type { StoryFn } from '@storybook/vue3';

export default {
	title: 'Atoms/Button',
	component: N8nButton,
	argTypes: {
		type: {
			control: 'select',
			options: ['primary', 'secondary', 'tertiary', 'success', 'warning', 'danger'],
		},
		size: {
			control: {
				type: 'select',
			},
			options: ['mini', 'small', 'medium', 'large', 'xlarge'],
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

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nButton,
	},
	template: '<n8n-button v-bind="args" @click="onClick" />',
	methods,
});

export const Button = Template.bind({});
Button.args = {
	label: 'Button',
};

const AllSizesTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nButton,
	},
	template: `<div>
		<n8n-button v-bind="args" size="large" @click="onClick" />
		<n8n-button v-bind="args" size="medium" @click="onClick" />
		<n8n-button v-bind="args" size="small" @click="onClick" />
		<n8n-button v-bind="args" :loading="true" @click="onClick" />
		<n8n-button v-bind="args" :disabled="true" @click="onClick" />
	</div>`,
	methods,
});

const AllColorsAndSizesTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nButton,
	},
	template: `<div>
		<n8n-button v-bind="args" size="large" type="primary" @click="onClick" />
		<n8n-button v-bind="args" size="large" type="secondary" @click="onClick" />
		<n8n-button v-bind="args" size="large" type="tertiary" @click="onClick" />
		<n8n-button v-bind="args" size="large" type="success" @click="onClick" />
		<n8n-button v-bind="args" size="large" type="warning" @click="onClick" />
		<n8n-button v-bind="args" size="large" type="danger" @click="onClick" />
		<br/>
		<br/>
		<n8n-button v-bind="args" size="medium" type="primary" @click="onClick" />
		<n8n-button v-bind="args" size="medium" type="secondary" @click="onClick" />
		<n8n-button v-bind="args" size="medium" type="tertiary" @click="onClick" />
		<n8n-button v-bind="args" size="medium" type="success" @click="onClick" />
		<n8n-button v-bind="args" size="medium" type="warning" @click="onClick" />
		<n8n-button v-bind="args" size="medium" type="danger" @click="onClick" />
		<br/>
		<br/>
		<n8n-button v-bind="args" size="small" type="primary" @click="onClick" />
		<n8n-button v-bind="args" size="small" type="secondary" @click="onClick" />
		<n8n-button v-bind="args" size="small" type="tertiary" @click="onClick" />
		<n8n-button v-bind="args" size="small" type="success" @click="onClick" />
		<n8n-button v-bind="args" size="small" type="warning" @click="onClick" />
		<n8n-button v-bind="args" size="small" type="danger" @click="onClick" />
	</div>`,
	methods,
});

export const Primary = AllSizesTemplate.bind({});
Primary.args = {
	type: 'primary',
	label: 'Button',
};

export const Secondary = AllSizesTemplate.bind({});
Secondary.args = {
	type: 'secondary',
	label: 'Button',
};

export const Tertiary = AllSizesTemplate.bind({});
Tertiary.args = {
	type: 'tertiary',
	label: 'Button',
};

export const Success = AllSizesTemplate.bind({});
Success.args = {
	type: 'success',
	label: 'Button',
};

export const Warning = AllSizesTemplate.bind({});
Warning.args = {
	type: 'warning',
	label: 'Button',
};

export const Danger = AllSizesTemplate.bind({});
Danger.args = {
	type: 'danger',
	label: 'Button',
};

export const Outline = AllColorsAndSizesTemplate.bind({});
Outline.args = {
	outline: true,
	label: 'Button',
};

export const Text = AllColorsAndSizesTemplate.bind({});
Text.args = {
	text: true,
	label: 'Button',
};

export const WithIcon = AllSizesTemplate.bind({});
WithIcon.args = {
	label: 'Button',
	icon: 'plus-circle',
};

export const Square = AllColorsAndSizesTemplate.bind({});
Square.args = {
	label: '48',
	square: true,
};
