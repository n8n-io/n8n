import N8nCard from './Card.vue';

export default {
	title: 'Atoms/Card',
	component: N8nCard,
	argTypes: {
		title: {
			control: {
				type: 'text',
			},
		},
	},
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nCard,
	},
	template: '<n8n-card v-bind="$props"></n8n-card>',
});

export const Card = Template.bind({});
