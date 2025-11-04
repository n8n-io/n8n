import type { StoryFn } from '@storybook/vue3-vite';

import Comp from './COmp.vue';

export default {
	title: 'V2/Comp',
	component: Comp,
};

const Template: StoryFn = (args) => ({
	setup: () => ({ args }),
	components: { Comp },
	template: '<Comp v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {};
