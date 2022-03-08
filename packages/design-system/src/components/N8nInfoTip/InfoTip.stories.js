import N8nInfoTip from './InfoTip.vue';

export default {
	title: 'Atoms/InfoTip',
	component: N8nInfoTip,
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nInfoTip,
	},
	template:
		'<n8n-info-tip>Need help doing something? <a href="/docs" target="_blank">Open docs</a></n8n-info-tip>',
});

export const InputLabel = Template.bind({});
