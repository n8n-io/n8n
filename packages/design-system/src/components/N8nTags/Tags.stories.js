import N8nTags from './Tags.vue';

export default {
	title: 'Atoms/Tags',
	component: N8nTags,
	argTypes: {
	},
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nTags,
	},
	template:
    '<n8n-tags v-bind="$props"></n8n-tags>',
});

export const Tags = Template.bind({});
Tags.args = {
	tags: [
		{
			id: 1,
			name: 'very long tag name',
		},
		{
			id: 2,
			name: 'tag1',
		},
		{
			id: 3,
			name: 'tag2 yo',
		},
	],
};
