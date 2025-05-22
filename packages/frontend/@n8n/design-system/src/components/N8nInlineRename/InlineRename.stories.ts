import type { StoryFn } from '@storybook/vue3';

import N8nInlineRename from './InlineRename.vue';

export default {
	title: 'Atoms/InlineRename',
	component: N8nInlineRename,
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nInlineRename,
	},
	template: `
		<div style="padding: 2rem; display: flex; gap: 1rem;">
			<n8n-inline-rename v-bind="args" />
		</div>
	`,
});

export const primary = Template.bind({});
primary.args = {
	modelValue: 'Test',
};
