import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import N8nFloatingWindow from './FloatingWindow.vue';
import N8nIcon from '../N8nIcon';

export default {
	title: 'Core/FloatingWindow',
	component: N8nFloatingWindow,
	argTypes: {
		width: {
			control: { type: 'number' },
		},
		height: {
			control: { type: 'number' },
		},
		minWidth: {
			control: { type: 'number' },
		},
		minHeight: {
			control: { type: 'number' },
		},
	},
	parameters: {
		docs: {
			story: {
				inline: false,
				iframeHeight: 500,
			},
		},
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({
		args,
		onClose: action('close'),
		onResize: action('resize'),
		onMove: action('move'),
	}),
	props: Object.keys(argTypes),
	components: {
		N8nFloatingWindow,
		N8nIcon,
	},
	template: `<n8n-floating-window v-bind="args" @close="onClose" @resize="onResize" @move="onMove">
		<template #header-icon>
			<n8n-icon icon="comment-dots" size="medium" />
		</template>
		<template #header>Floating Window</template>
		<template #header-actions>
			<n8n-icon icon="expand" size="small" style="cursor: pointer;" />
		</template>
		<div style="padding: 16px;">
			<p>This is the default slot content. The window can be dragged by its header and resized from any edge or corner.</p>
		</div>
	</n8n-floating-window>`,
});

export const Default = Template.bind({});
Default.args = {
	width: 560,
	height: 400,
	minWidth: 400,
	minHeight: 300,
	initialPosition: { x: 0, y: 0 },
};
