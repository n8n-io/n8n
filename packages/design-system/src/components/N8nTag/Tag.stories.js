import N8nTag from './Tag.vue';

export default {
	title: 'Atoms/Tag',
	component: N8nTag,
	argTypes: {
		text: {
			control: {
				control: 'text',
			},
		},
	},
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nTag,
	},
	template: '<n8n-tag v-bind="$props"></n8n-tag>',
});

export const Tag = Template.bind({});
Tag.args = {
	text: 'tag name',
};
