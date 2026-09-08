import { type StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';
import { computed, ref } from 'vue';

import N8nResizeWrapper from './ResizeWrapper.vue';
import type { ResizeData } from '../../types';

export default {
	title: 'Core/ResizeWrapper',
	component: N8nResizeWrapper,

	parameters: {
		docs: {
			description: { component: 'A wrapper that adds drag-resize handles to enclosed content.' },
		},
	},
};

const Template: StoryFn = (args) => ({
	setup: () => {
		const newWidth = ref(args.width);
		const newHeight = ref(args.height);

		function onResize(resizeData: ResizeData) {
			action('resize')(resizeData);
			newHeight.value = resizeData.height;
			newWidth.value = resizeData.width;
		}

		const panelStyles = computed(() => ({
			width: `${newWidth.value}px`,
			height: `${newHeight.value}px`,
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			background: 'var(--background--surface)',
			border: 'var(--border)',
			color: 'var(--color--text--tint-1)',
			fontFamily: 'var(--font-family)',
			fontSize: 'var(--font-size--sm)',
		}));

		return {
			args,
			newWidth,
			newHeight,
			onResize,
			onResizeEnd: action('resizeend'),
			onResizeStart: action('resizestart'),
			panelStyles,
		};
	},
	components: {
		N8nResizeWrapper,
	},
	template: `<div style="width: fit-content; padding: var(--spacing--xl)">
			<n8n-resize-wrapper
				v-bind="args"
				:width="newWidth"
				:height="newHeight"
				@resize="onResize"
				@resizeend="onResizeEnd"
				@resizestart="onResizeStart"
			>
				<div :style="panelStyles">Hover or drag an edge</div>
			</n8n-resize-wrapper>
		</div>`,
});

export const Default = Template.bind({});
Default.args = {
	width: 200,
	height: 200,
	minWidth: 200,
	minHeight: 200,
	scale: 1,
	gridSize: 20,
	isResizingEnabled: true,
	supportedDirections: [
		'right',
		'top',
		'bottom',
		'left',
		'topLeft',
		'topRight',
		'bottomLeft',
		'bottomRight',
	],
};
