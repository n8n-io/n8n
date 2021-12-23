import N8nTag from './Tag.vue';

export default {
	title: 'Atoms/Tag',
	component: N8nImage,
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nTag,
	},
	template:
		'<n8n-tag></n8n-tag>',
});

export const InputLabel = Template.bind({});
