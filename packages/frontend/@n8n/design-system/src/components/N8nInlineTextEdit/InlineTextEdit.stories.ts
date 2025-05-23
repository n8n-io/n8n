import type { StoryFn } from '@storybook/vue3';

import InlineTextEdit from './InlineTextEdit.vue';

export default {
	title: 'Atoms/InlineTextEdit',
	component: InlineTextEdit,
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		InlineTextEdit,
	},
	template: `
		<div style="padding: 2rem; display: flex; gap: 1rem;">
			<n8n-inline-text-edit v-bind="args" />
		</div>
	`,
});

export const primary = Template.bind({});
primary.args = {
	modelValue: 'Test',
};
