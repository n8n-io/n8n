import N8nText from './Text.vue';

export default {
	title: 'Atoms/Text',
	component: N8nText,
	argTypes: {
		type: {
			control: {
				type: 'select',
				options: ['heading', 'body'],
			},
		},
		size: {
			control: {
				type: 'select',
				options: ['small', 'medium', 'large', 'xlarge'],
			},
		},
	},
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nText,
	},
	template: '<n8n-text v-bind="$props" />',
});

export const Text = Template.bind({});
Text.args = {
	text: 'hello world',
};
