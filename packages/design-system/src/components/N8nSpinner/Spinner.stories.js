import N8nSpinner from './Spinner.vue';

export default {
	title: 'Atoms/Spinner',
	component: N8nSpinner,
	argTypes: {
		size: {
			control: {
				type: 'select',
				options: ['small', 'medium', 'large'],
			},
		},
	},
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nSpinner,
	},
	template: '<n8n-spinner v-bind="$props" />',
});

export const Spinner = Template.bind({});
