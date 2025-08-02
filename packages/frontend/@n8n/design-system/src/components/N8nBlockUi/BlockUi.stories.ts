import type { StoryFn } from '@storybook/vue3';

import N8nBlockUi from './BlockUi.vue';

export default {
	title: 'Atoms/BlockUI',
	component: N8nBlockUi,
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nBlockUi,
	},
	template:
		'<div style="position: relative; width: 100%; height: 300px;"><n8n-block-ui v-bind="args" /></div>',
});

export const BlockUi = Template.bind({});
BlockUi.args = {
	show: false,
};
