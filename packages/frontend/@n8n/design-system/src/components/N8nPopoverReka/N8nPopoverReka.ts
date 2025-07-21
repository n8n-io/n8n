import type { StoryFn } from '@storybook/vue3';

import N8nPopoverReka from './N8nPopoverReka.vue';

export default {
	title: 'Atoms/N8nPopoverReka',
	component: N8nPopoverReka,
};

const Template: StoryFn = (args) => ({
	setup: () => ({ args }),
	props: args,
	components: {
		N8nPopoverReka,
	},
	template: '<popover-reka v-bind="args" />',
});

export const AllColumnsShown = Template.bind({});
AllColumnsShown.args = {};
