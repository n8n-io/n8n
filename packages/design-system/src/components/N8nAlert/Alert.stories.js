import N8nAlert from './Alert.vue';

export default {
	title: 'Atoms/Alert',
	component: N8nAlert,
	argTypes: {
		type: {
			type: 'select',
			options: ['info', 'success', 'error', 'warning'],
		},
		showIcon: {
			type: 'boolean',
		},
		closable: {
			type: 'boolean',
		},
		title: {
			type: 'string',
		},
	},
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nAlert,
	},
	template: '<n8n-alert v-bind="$props">Message from above</n8n-alert>',
});

export const Alert = Template.bind({});
