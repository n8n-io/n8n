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
		<div class="story">
			<N8nInlineTextEdit v-bind="args" />
		</div>
	`,
});

export const primary = Template.bind({});
primary.args = {
	modelValue: 'Test',
};

export const placeholder = Template.bind({});
placeholder.args = {
	modelValue: '',
	placeholder: 'Enter workflow name',
};
