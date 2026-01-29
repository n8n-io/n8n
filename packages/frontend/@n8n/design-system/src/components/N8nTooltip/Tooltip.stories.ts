/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import N8nButton from '@n8n/design-system/components/N8nButton/Button.vue';
import N8nIcon from '@n8n/design-system/components/N8nIcon/Icon.vue';

import Tooltip from './Tooltip.vue';

const meta = {
	title: 'Atoms/Tooltip',
	component: Tooltip,
	parameters: {
		docs: {
			source: { type: 'dynamic' },
		},
	},
} satisfies Meta<typeof Tooltip>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default = {
	render: (args) => ({
		components: { Tooltip, N8nButton },
		setup() {
			return { args };
		},
		template: `
		<div style="display: flex; justify-content: center; align-items: center; padding: 100px;">
			<Tooltip v-bind="args">
				<N8nButton label="Hover me" />
			</Tooltip>
		</div>
		`,
	}),
	args: {
		content: 'This is a helpful tooltip',
		placement: 'top',
	},
} satisfies Story;

export const Placements = {
	render: (args) => ({
		components: { Tooltip, N8nButton },
		setup() {
			return { args };
		},
		template: `
		<div style="padding: 200px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
			<div style="text-align: right;">
				<Tooltip content="Top start" placement="top-start">
					<N8nButton label="top-start" />
				</Tooltip>
			</div>
			<div style="text-align: center;">
				<Tooltip content="Top" placement="top">
					<N8nButton label="top" />
				</Tooltip>
			</div>
			<div style="text-align: left;">
				<Tooltip content="Top end" placement="top-end">
					<N8nButton label="top-end" />
				</Tooltip>
			</div>

			<div style="text-align: right;">
				<Tooltip content="Left start" placement="left-start">
					<N8nButton label="left-start" />
				</Tooltip>
			</div>
			<div style="text-align: center;">
				<Tooltip content="Center" placement="top">
					<N8nButton label="center" />
				</Tooltip>
			</div>
			<div style="text-align: left;">
				<Tooltip content="Right start" placement="right-start">
					<N8nButton label="right-start" />
				</Tooltip>
			</div>

			<div style="text-align: right;">
				<Tooltip content="Left" placement="left">
					<N8nButton label="left" />
				</Tooltip>
			</div>
			<div style="text-align: center;">
				<!-- Empty cell -->
			</div>
			<div style="text-align: left;">
				<Tooltip content="Right" placement="right">
					<N8nButton label="right" />
				</Tooltip>
			</div>

			<div style="text-align: right;">
				<Tooltip content="Left end" placement="left-end">
					<N8nButton label="left-end" />
				</Tooltip>
			</div>
			<div style="text-align: center;">
				<!-- Empty cell -->
			</div>
			<div style="text-align: left;">
				<Tooltip content="Right end" placement="right-end">
					<N8nButton label="right-end" />
				</Tooltip>
			</div>

			<div style="text-align: right;">
				<Tooltip content="Bottom start" placement="bottom-start">
					<N8nButton label="bottom-start" />
				</Tooltip>
			</div>
			<div style="text-align: center;">
				<Tooltip content="Bottom" placement="bottom">
					<N8nButton label="bottom" />
				</Tooltip>
			</div>
			<div style="text-align: left;">
				<Tooltip content="Bottom end" placement="bottom-end">
					<N8nButton label="bottom-end" />
				</Tooltip>
			</div>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const HTMLContent = {
	render: (args) => ({
		components: { Tooltip, N8nButton },
		setup() {
			return { args };
		},
		template: `
		<div style="display: flex; justify-content: center; align-items: center; padding: 100px;">
			<Tooltip v-bind="args">
				<N8nButton label="Hover for rich content" />
			</Tooltip>
		</div>
		`,
	}),
	args: {
		content: '<strong>Bold</strong> text with <em>emphasis</em>',
		placement: 'top',
	},
} satisfies Story;

export const CustomContentSlot = {
	render: (args) => ({
		components: { Tooltip, N8nButton, N8nIcon },
		setup() {
			return { args };
		},
		template: `
		<div style="display: flex; justify-content: center; align-items: center; padding: 100px;">
			<Tooltip v-bind="args">
				<template #content>
					<div style="display: flex; align-items: center; gap: 8px;">
						<N8nIcon icon="info-circle" />
						<div>
							<strong>Custom Content</strong>
							<p style="margin: 4px 0 0 0; font-size: 12px;">With multiple elements</p>
						</div>
					</div>
				</template>
				<N8nButton label="Hover for custom content" />
			</Tooltip>
		</div>
		`,
	}),
	args: {
		placement: 'top',
	},
} satisfies Story;

export const DelayedShow = {
	render: (args) => ({
		components: { Tooltip, N8nButton },
		setup() {
			return { args };
		},
		template: `
		<div style="display: flex; justify-content: center; align-items: center; padding: 100px;">
			<Tooltip v-bind="args">
				<N8nButton label="Hover and wait..." />
			</Tooltip>
		</div>
		`,
	}),
	args: {
		content: 'This tooltip appears after 500ms',
		placement: 'top',
		showAfter: 500,
	},
} satisfies Story;

export const ProgrammaticControl = {
	render: (args) => ({
		components: { Tooltip, N8nButton },
		setup() {
			const isVisible = ref(false);

			const toggleTooltip = () => {
				isVisible.value = !isVisible.value;
			};

			return { args, isVisible, toggleTooltip };
		},
		template: `
		<div style="display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 100px;">
			<N8nButton label="Toggle Tooltip" @click="toggleTooltip" />
			<Tooltip v-bind="args" :visible="isVisible">
				<div style="padding: 20px; border: 2px dashed #ccc; border-radius: 4px;">
					Target element
				</div>
			</Tooltip>
		</div>
		`,
	}),
	args: {
		content: 'This tooltip is programmatically controlled',
		placement: 'top',
	},
} satisfies Story;

export const Disabled = {
	render: (args) => ({
		components: { Tooltip, N8nButton },
		setup() {
			const enabled = ref(false);
			return { args, enabled };
		},
		template: `
		<div style="display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 100px;">
			<label style="display: flex; align-items: center; gap: 8px;">
				<input type="checkbox" v-model="enabled" />
				Enable tooltip
			</label>
			<Tooltip v-bind="args" :disabled="!enabled">
				<N8nButton label="Hover me" />
			</Tooltip>
		</div>
		`,
	}),
	args: {
		content: 'This tooltip can be enabled/disabled',
		placement: 'top',
	},
} satisfies Story;

export const WithOffset = {
	render: (args) => ({
		components: { Tooltip, N8nButton },
		setup() {
			return { args };
		},
		template: `
		<div style="display: flex; justify-content: center; gap: 40px; padding: 100px;">
			<Tooltip content="No offset" placement="top">
				<N8nButton label="No offset" />
			</Tooltip>
			<Tooltip content="20px offset" placement="top" :offset="20">
				<N8nButton label="20px offset" />
			</Tooltip>
			<Tooltip content="40px offset" placement="top" :offset="40">
				<N8nButton label="40px offset" />
			</Tooltip>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const WithIcon = {
	render: (args) => ({
		components: { Tooltip, N8nIcon },
		setup() {
			return { args };
		},
		template: `
		<div style="display: flex; justify-content: center; align-items: center; padding: 100px;">
			<Tooltip v-bind="args">
				<N8nIcon icon="question-circle" size="large" />
			</Tooltip>
		</div>
		`,
	}),
	args: {
		content: 'Click the icon for more information',
		placement: 'right',
	},
} satisfies Story;

export const NotEnterable = {
	render: (args) => ({
		components: { Tooltip, N8nButton },
		setup() {
			return { args };
		},
		template: `
		<div style="display: flex; justify-content: center; align-items: center; padding: 100px;">
			<Tooltip v-bind="args">
				<N8nButton label="Hover me (tooltip closes immediately when leaving)" />
			</Tooltip>
		</div>
		`,
	}),
	args: {
		content: 'This tooltip closes immediately when mouse leaves trigger',
		placement: 'top',
		enterable: false,
	},
} satisfies Story;

export const WithButtons = {
	render: (args) => ({
		components: { Tooltip, N8nButton },
		setup() {
			const handleButton1Click = () => alert('Button 1 clicked!');
			const handleButton2Click = () => alert('Button 2 clicked!');
			return {
				args,
				buttons: [
					{
						attrs: { label: 'Button 1', type: 'secondary', size: 'mini' },
						listeners: { onClick: handleButton1Click },
					},
					{
						attrs: { label: 'Button 2', type: 'primary', size: 'mini' },
						listeners: { onClick: handleButton2Click },
					},
				],
			};
		},
		template: `
		<div style="display: flex; justify-content: center; align-items: center; padding: 100px;">
			<Tooltip v-bind="args" :buttons="buttons">
				<N8nButton label="Hover for tooltip with buttons" />
			</Tooltip>
		</div>
		`,
	}),
	args: {
		content: 'This tooltip has action buttons below',
		placement: 'top',
	},
} satisfies Story;

export const WithContentClass = {
	render: (args) => ({
		components: { Tooltip, N8nButton },
		setup() {
			return { args };
		},
		template: `
		<div style="display: flex; justify-content: center; align-items: center; padding: 100px;">
			<Tooltip v-bind="args">
				<N8nButton label="Hover for styled tooltip" />
			</Tooltip>
		</div>
		<style>
			.custom-tooltip-style {
				max-width: 300px !important;
				background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
			}
		</style>
		`,
	}),
	args: {
		content: 'This tooltip has a custom class applied',
		placement: 'top',
		contentClass: 'custom-tooltip-style',
	},
} satisfies Story;
