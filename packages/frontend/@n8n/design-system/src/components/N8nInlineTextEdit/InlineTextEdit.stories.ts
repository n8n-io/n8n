import type { StoryFn } from '@storybook/vue3';
import { ref } from 'vue';

import InlineTextEdit from './InlineTextEdit.vue';

export default {
	title: 'Atoms/InlineTextEdit',
	component: InlineTextEdit,
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup() {
		const model = ref(args.modelValue);
		return { args, model };
	},
	props: Object.keys(argTypes),
	components: {
		InlineTextEdit,
	},
	template: `
		<div class="story">
			<N8nInlineTextEdit v-bind="args" v-model="model"/>
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
