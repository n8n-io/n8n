import type { StoryFn } from '@storybook/vue3';

import CommandBar from './CommandBar.vue';

export default {
	title: 'Modules/CommandBar',
	component: CommandBar,
	argTypes: {},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		CommandBar,
	},
	template: '<CommandBar v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {
	hotkeys: [
		{
			id: 'Add node',
			title: 'Add node',
			section: 'Nodes',
			parent: null,
		},
		{
			id: 'Open node',
			title: 'Open node',
			section: 'Nodes',
			parent: null,
		},
		{
			id: 'Add template 1',
			title: 'Add template 1',
			section: 'Templates',
		},
	],
};
