import { type ActionOptions, action } from '@storybook/addon-actions';
import { type StoryFn } from '@storybook/vue3';
import { ref } from 'vue';

import N8nResizeWrapper from './ResizeWrapper.vue';

// TODO: remove this after converting ResizeWrapper to composition API
interface ResizeData extends ActionOptions {
	height: number;
	width: number;
}

export default {
	title: 'Atoms/ResizeWrapper',
	component: N8nResizeWrapper,
};

const methods = {
	onInput: action('input'),
	onResizeEnd: action('resizeend'),
	onResizeStart: action('resizestart'),
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => {
		const newWidth = ref(args.width);
		const newHeight = ref(args.height);

		function onResize(resizeData: ResizeData) {
			action('resize', resizeData);
			newHeight.value = resizeData.height;
			newWidth.value = resizeData.width;
		}

		return {
			onResize,
			newWidth,
			newHeight,
			background:
				'linear-gradient(90deg, rgba(255,0,0,1) 0%, rgba(255,154,0,1) 10%, rgba(208,222,33,1) 20%, rgba(79,220,74,1) 30%, rgba(63,218,216,1) 40%, rgba(47,201,226,1) 50%, rgba(28,127,238,1) 60%, rgba(95,21,242,1) 70%, rgba(186,12,248,1) 80%, rgba(251,7,217,1) 90%, rgba(255,0,0,1) 100%)',
			args,
		};
	},
	props: Object.keys(argTypes),
	components: {
		N8nResizeWrapper,
	},
	computed: {
		containerStyles() {
			return {
				width: `${this.newWidth}px`,
				height: `${this.newHeight}px`,
				background: this.background,
			};
		},
	},
	template: `<div style="width: fit-content; height: fit-content">
			<n8n-resize-wrapper
				v-bind="args"
				@resize="onResize"
				@resizeend="onResizeEnd"
				@resizestart="onResizeStart"
				@input="onInput"
				:width="newWidth"
				:height="newHeight"
			>
				<div :style="containerStyles" />
			</n8n-resize-wrapper>
		</div>`,
	methods,
});

export const Resize = Template.bind({});
Resize.args = {
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
