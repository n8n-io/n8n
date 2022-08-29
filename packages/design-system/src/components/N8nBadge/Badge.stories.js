import N8nBadge from './Badge.vue';

export default {
	title: 'Atoms/Badge',
	component: N8nBadge,
	argTypes: {
		theme: {
			type: 'text',
			options: ['default', 'primary', 'secondary', 'tertiary'],
		},
		size: {
			type: 'select',
			options: ['small', 'medium', 'large'],
		},
	},
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nBadge,
	},
	template:
		'<n8n-badge v-bind="$props">Badge</n8n-badge>',
});

export const Badge = Template.bind({});
Badge.args = {};
