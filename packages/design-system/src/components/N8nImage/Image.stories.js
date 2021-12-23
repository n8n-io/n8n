import N8nImage from './Image.vue';

export default {
  title: 'Atoms/Image',
  component: N8nImage,
	argTypes: {
		images: {
			control: {
				type: 'array',
			},
		},
	},
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: {
    N8nImage,
  },
  template:
    '<n8n-image v-bind="$props"></n8n-image>',
});

export const Image = Template.bind({});
