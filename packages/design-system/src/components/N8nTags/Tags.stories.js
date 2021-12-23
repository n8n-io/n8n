import N8nTags from './Tags.vue';

export default {
	title: 'Atoms/Tags',
	component: N8nTags,
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nTags,
	},
	template:
		'<n8n-tags></n8n-tags>',
});

export const InputLabel = Template.bind({});
