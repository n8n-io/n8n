import N8nHeading from './Heading.vue';

export default {
	title: 'Atoms/Heading',
	component: N8nHeading,
	argTypes: {
		size: {
			control: {
				type: 'select',
				options: ['small', 'medium', 'large', 'xlarge', '2xlarge'],
			},
		},
	},
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nHeading,
	},
	template: '<n8n-heading v-bind="$props">hello world</n8n-heading>',
});

export const Heading = Template.bind({});
