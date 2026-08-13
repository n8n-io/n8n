import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';
import { computed, ref } from 'vue';

import N8nSticky from './Sticky.vue';
import N8nResizeWrapper from '../N8nResizeWrapper/ResizeWrapper.vue';

const meta: Meta<typeof N8nSticky> = {
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
				type: 'number',
			},
		},
		minHeight: {
			control: {
				type: 'number',
			},
		},
		minWidth: {
			control: {
				type: 'number',
			},
		},
		readOnly: {
			control: {
				type: 'boolean',
			},
		},
		width: {
			control: {
				type: 'number',
			},
		},
	},
	parameters: {
		docs: {
			description: {
				component: 'An editable sticky-note component with markdown content and color variants.',
			},
		},
		themePreview: {
			minHeight: 240,
		},
	},
	render: (args) => ({
		components: { N8nSticky },
		setup() {
			const value = ref(args.modelValue);
			const editMode = ref(false);
			const stickyArgs = computed(() => {
				const { modelValue: _modelValue, editMode: _editMode, ...rest } = args;
				return rest;
			});

			const onEdit = (editing: boolean) => {
				editMode.value = editing;
				action('edit')(editing);
			};

			return {
				value,
				editMode,
				stickyArgs,
				onEdit,
				onMarkdownClick: action('markdown-click'),
				onUpdateModelValue: action('update:modelValue'),
			};
		},
		template: `
			<div :style="{ position: 'relative', width: stickyArgs.width + 'px', height: stickyArgs.height + 'px' }">
				<n8n-sticky
					v-bind="stickyArgs"
					v-model="value"
					:edit-mode="editMode"
					@edit="onEdit"
					@markdown-click="onMarkdownClick"
					@update:modelValue="onUpdateModelValue"
				/>
			</div>
		`,
	}),
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Sticky: Story = {
	args: {
		height: 180,
		width: 240,
		modelValue:
			"## I'm a note \n**Double click** to edit me. [Guide](https://docs.n8n.io/workflows/components/sticky-notes/)",
		minHeight: 80,
		minWidth: 150,
		readOnly: false,
		backgroundColor: 1,
	},
};

export const Resizable: Story = {
	args: {
		...Sticky.args,
	},
	render: (args) => ({
		components: {
			N8nResizeWrapper,
			N8nSticky,
		},
		setup() {
			const value = ref(args.modelValue);
			const editMode = ref(false);
			const width = ref(args.width ?? 240);
			const height = ref(args.height ?? 180);

			const stickyArgs = computed(() => {
				const {
					modelValue: _modelValue,
					editMode: _editMode,
					width: _width,
					height: _height,
					...rest
				} = args;
				return rest;
			});

			const onEdit = (editing: boolean) => {
				editMode.value = editing;
				action('edit')(editing);
			};

			const onResize = (resizeData: { height: number; width: number }) => {
				action('resize')(resizeData);
				height.value = resizeData.height;
				width.value = resizeData.width;
			};

			return {
				args,
				value,
				editMode,
				width,
				height,
				stickyArgs,
				onEdit,
				onResize,
				onMarkdownClick: action('markdown-click'),
				onUpdateModelValue: action('update:modelValue'),
				onResizeEnd: action('resizeend'),
				onResizeStart: action('resizestart'),
			};
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
						v-bind="stickyArgs"
						v-model="value"
						:edit-mode="editMode"
						:width="width"
						:height="height"
						@edit="onEdit"
						@markdown-click="onMarkdownClick"
						@update:modelValue="onUpdateModelValue"
					/>
				</n8n-resize-wrapper>
			</div>
		`,
	}),
};
