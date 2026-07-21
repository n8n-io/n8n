import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import N8nFloatingWindow from './FloatingWindow.vue';
import N8nIcon from '../N8nIcon';

const meta: Meta<typeof N8nFloatingWindow> = {
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
			description: {
				component: 'A draggable and resizable floating panel with header and content regions.',
			},
			story: {
				inline: false,
				iframeHeight: 500,
			},
		},
		themePreview: {
			minHeight: 520,
		},
	},
	render: (args) => ({
		components: {
			N8nFloatingWindow,
			N8nIcon,
		},
		setup: () => ({
			args,
			onClose: action('close'),
			onResize: action('resize'),
			onMove: action('move'),
		}),
		template: `
			<div
				style="
					position: relative;
					width: 100%;
					height: 480px;
					overflow: hidden;
				"
			>
				<n8n-floating-window
					v-bind="args"
					@close="onClose"
					@resize="onResize"
					@move="onMove"
				>
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
				</n8n-floating-window>
			</div>
		`,
	}),
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		width: 360,
		height: 280,
		minWidth: 240,
		minHeight: 180,
		initialPosition: { x: 16, y: 16 },
	},
};
