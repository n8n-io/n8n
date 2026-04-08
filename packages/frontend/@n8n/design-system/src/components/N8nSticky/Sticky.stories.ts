import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';
import { ref } from 'vue';

import N8nSticky from './Sticky.vue';
import N8nResizeWrapper from '../N8nResizeWrapper/ResizeWrapper.vue';

export default {
	title: 'Core/Sticky',
	component: N8nSticky,
	argTypes: {
		backgroundColor: {
			control: {
				type: 'select',
			},
			options: [1, 2, 3, 4, 5, '#fff59d', '#ffd180'],
		},
		height: {
			control: {
				control: 'number',
			},
		},
		minHeight: {
			control: {
				control: 'number',
			},
		},
		minWidth: {
			control: {
				control: 'number',
			},
		},
		readOnly: {
			control: {
				control: 'Boolean',
			},
		},
		width: {
			control: {
				control: 'number',
			},
		},
	},
	parameters: {
		docs: {
			description: {
				component: 'An editable sticky-note component with markdown content and color variants.',
			},
		},
	},
};

const methods = {
	onEdit: action('edit'),
	onMarkdownClick: action('markdown-click'),
	onUpdateModelValue: action('update:modelValue'),
	onResize: action('resize'),
	onResizeEnd: action('resizeend'),
	onResizeStart: action('resizestart'),
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nSticky,
	},
	template: `
		<n8n-sticky
			v-bind="args"
			@edit="onEdit"
			@markdown-click="onMarkdownClick"
			@update:modelValue="onUpdateModelValue"
		></n8n-sticky>
	`,
	methods,
});

export const Sticky = Template.bind({});
Sticky.args = {
	height: 180,
	width: 240,
	modelValue:
		"## I'm a note \n**Double click** to edit me. [Guide](https://docs.n8n.io/workflows/components/sticky-notes/)",
	minHeight: 80,
	minWidth: 150,
	readOnly: false,
	backgroundColor: 1,
};

const ResizableTemplate: StoryFn = (args) => ({
	setup: () => {
		const width = ref(args.width ?? 240);
		const height = ref(args.height ?? 180);

		const onResize = (resizeData: { height: number; width: number }) => {
			action('resize')(resizeData);
			height.value = resizeData.height;
			width.value = resizeData.width;
		};

		return { args, width, height, onResize };
	},
	components: {
		N8nResizeWrapper,
		N8nSticky,
	},
	template: `
		<div style="width: fit-content; height: fit-content; position: relative;">
			<n8n-resize-wrapper
				:is-resizing-enabled="!args.readOnly"
				:width="width"
				:height="height"
				:min-width="args.minWidth"
				:min-height="args.minHeight"
				:grid-size="20"
				:scale="1"
				@resize="onResize"
				@resizeend="onResizeEnd"
				@resizestart="onResizeStart"
			>
				<n8n-sticky
					v-bind="args"
					:width="width"
					:height="height"
					@edit="onEdit"
					@markdown-click="onMarkdownClick"
					@update:modelValue="onUpdateModelValue"
				></n8n-sticky>
			</n8n-resize-wrapper>
		</div>
	`,
	methods,
});

export const Resizable = ResizableTemplate.bind({});
Resizable.args = {
	...Sticky.args,
};
