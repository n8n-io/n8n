import N8nImage from './Image.vue';

export default {
	title: 'Atoms/Image',
	component: N8nImage,
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nImage,
	},
	template:
		'<n8n-image></n8n-image>',
});

export const InputLabel = Template.bind({});
