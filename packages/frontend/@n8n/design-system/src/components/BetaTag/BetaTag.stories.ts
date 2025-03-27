import type { StoryFn } from '@storybook/vue3';

import BetaTag from './BetaTag.vue';

export default {
	title: 'Assistant/BetaTag',
	component: BetaTag,
	argTypes: {},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		BetaTag,
	},
	template: '<BetaTag v-bind="args" />',
});

export const Beta = Template.bind({});
