import N8nTags from './Tags.vue';

export default {
  title: 'Atoms/Tags',
  component: N8nTags,
	argTypes: {
		tags: {
			control: {
				type: 'array',
			},
		},
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
