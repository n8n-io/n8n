import type { StoryFn } from '@storybook/vue3';

import N8nKeyboardShorcut from './N8nKeyboardShortcut.vue';

export default {
	title: 'Atoms/KeyboardShortcut',
	component: N8nKeyboardShorcut,
};

const template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nKeyboardShorcut,
	},
	template: '<n8n-keyboard-shortcut v-bind="args" />',
});

export const defaultShortcut = template.bind({});
defaultShortcut.args = {
	keys: ['s'],
	altKey: true,
	metaKey: true,
	shiftKey: true,
};
