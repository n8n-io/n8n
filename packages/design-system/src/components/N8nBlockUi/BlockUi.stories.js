import N8nBlockUi from './BlockUi.vue';

export default {
	title: 'Atoms/BlockUI',
	component: N8nBlockUi,
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nBlockUi,
	},
	template:
		'<div style="position: relative; width: 100%; height: 300px;"><n8n-block-ui v-bind="$props" /></div>',
});

export const BlockUi = Template.bind({});
BlockUi.args = {
	show: false,
};
