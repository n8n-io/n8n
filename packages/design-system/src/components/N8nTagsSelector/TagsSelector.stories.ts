import { action } from '@storybook/addon-actions';
import type { StoryFn } from '@storybook/vue3';
import { ref, watch } from 'vue';

import N8nTagsSelector from './TagsSelector.vue';

export default {
	title: 'Modules/TagsSelector',
	component: N8nTagsSelector,
	argTypes: {},
	parameters: {
		backgrounds: { default: '--color-background-light' },
	},
};

export const TagsSelector: StoryFn = (args, { argTypes }) => ({
	setup() {
		const model = ref(args.selectedTags);

		// Optional: Keeps v-model in sync with storybook args
		watch(
			() => args.selectedTags,
			(val) => {
				model.value = val;
			},
		);

		const { model: dropped, ...rest } = args;

		return { args: rest, model };
	},
	props: Object.keys(argTypes),
	components: {
		N8nTagsSelector,
	},
	template: '<n8n-tags-selector v-model="model" v-bind="args" />',
	args: {
		selectedTags: ['a tag', 'another tag'],
		columnView: true,
		inputs: ['a clickable tag'],
	},
});
