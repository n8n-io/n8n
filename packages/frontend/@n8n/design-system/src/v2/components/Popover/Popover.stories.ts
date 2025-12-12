/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import N8nButton from '@n8n/design-system/components/N8nButton/Button.vue';

import Popover from './Popover.vue';

const meta = {
	title: 'Components v2/Popover',
	component: Popover,
	parameters: {
		docs: {
			source: { type: 'dynamic' },
		},
	},
} satisfies Meta<typeof Popover>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default = {
	render: (args) => ({
		components: { Popover, N8nButton },
		setup() {
			return { args };
		},
		template: `
		<div style="display: flex; justify-content: center; align-items: center; padding: 100px;">
			<Popover v-bind="args">
				<template #reference>
					<N8nButton label="Click me" />
				</template>
				<div style="padding: 12px;">
					<p style="margin: 0;">Popover content</p>
				</div>
			</Popover>
		</div>
		`,
	}),
	args: {
		placement: 'bottom',
		trigger: 'click',
	},
} satisfies Story;

export const HoverTrigger = {
	render: (args) => ({
		components: { Popover, N8nButton },
		setup() {
			return { args };
		},
		template: `
		<div style="display: flex; justify-content: center; align-items: center; padding: 100px;">
			<Popover v-bind="args">
				<template #reference>
					<N8nButton label="Hover me" />
				</template>
				<div style="padding: 12px;">
					<p style="margin: 0;">This popover appears on hover</p>
				</div>
			</Popover>
		</div>
		`,
	}),
	args: {
		placement: 'top',
		trigger: 'hover',
	},
} satisfies Story;

export const Placements = {
	render: (args) => ({
		components: { Popover, N8nButton },
		setup() {
			return { args };
		},
		template: `
		<div style="padding: 200px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
			<div style="text-align: right;">
				<Popover placement="top-start">
					<template #reference>
						<N8nButton label="top-start" />
					</template>
					<div style="padding: 12px;">Top start</div>
				</Popover>
			</div>
			<div style="text-align: center;">
				<Popover placement="top">
					<template #reference>
						<N8nButton label="top" />
					</template>
					<div style="padding: 12px;">Top</div>
				</Popover>
			</div>
			<div style="text-align: left;">
				<Popover placement="top-end">
					<template #reference>
						<N8nButton label="top-end" />
					</template>
					<div style="padding: 12px;">Top end</div>
				</Popover>
			</div>

			<div style="text-align: right;">
				<Popover placement="left-start">
					<template #reference>
						<N8nButton label="left-start" />
					</template>
					<div style="padding: 12px;">Left start</div>
				</Popover>
			</div>
			<div style="text-align: center;">
				<!-- Empty cell -->
			</div>
			<div style="text-align: left;">
				<Popover placement="right-start">
					<template #reference>
						<N8nButton label="right-start" />
					</template>
					<div style="padding: 12px;">Right start</div>
				</Popover>
			</div>

			<div style="text-align: right;">
				<Popover placement="left">
					<template #reference>
						<N8nButton label="left" />
					</template>
					<div style="padding: 12px;">Left</div>
				</Popover>
			</div>
			<div style="text-align: center;">
				<!-- Empty cell -->
			</div>
			<div style="text-align: left;">
				<Popover placement="right">
					<template #reference>
						<N8nButton label="right" />
					</template>
					<div style="padding: 12px;">Right</div>
				</Popover>
			</div>

			<div style="text-align: right;">
				<Popover placement="left-end">
					<template #reference>
						<N8nButton label="left-end" />
					</template>
					<div style="padding: 12px;">Left end</div>
				</Popover>
			</div>
			<div style="text-align: center;">
				<!-- Empty cell -->
			</div>
			<div style="text-align: left;">
				<Popover placement="right-end">
					<template #reference>
						<N8nButton label="right-end" />
					</template>
					<div style="padding: 12px;">Right end</div>
				</Popover>
			</div>

			<div style="text-align: right;">
				<Popover placement="bottom-start">
					<template #reference>
						<N8nButton label="bottom-start" />
					</template>
					<div style="padding: 12px;">Bottom start</div>
				</Popover>
			</div>
			<div style="text-align: center;">
				<Popover placement="bottom">
					<template #reference>
						<N8nButton label="bottom" />
					</template>
					<div style="padding: 12px;">Bottom</div>
				</Popover>
			</div>
			<div style="text-align: left;">
				<Popover placement="bottom-end">
					<template #reference>
						<N8nButton label="bottom-end" />
					</template>
					<div style="padding: 12px;">Bottom end</div>
				</Popover>
			</div>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const ControlledVisibility = {
	render: (args) => ({
		components: { Popover, N8nButton },
		setup() {
			const isVisible = ref(false);

			const togglePopover = () => {
				isVisible.value = !isVisible.value;
			};

			return { args, isVisible, togglePopover };
		},
		template: `
		<div style="display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 100px;">
			<N8nButton :label="isVisible ? 'Hide Popover' : 'Show Popover'" @click="togglePopover" />
			<Popover v-bind="args" v-model:visible="isVisible">
				<template #reference>
					<div style="padding: 20px; border: 2px dashed #ccc; border-radius: 4px;">
						Target element
					</div>
				</template>
				<div style="padding: 12px;">
					<p style="margin: 0;">Controlled popover content</p>
				</div>
			</Popover>
		</div>
		`,
	}),
	args: {
		placement: 'top',
	},
} satisfies Story;

export const CustomWidth = {
	render: (args) => ({
		components: { Popover, N8nButton },
		setup() {
			return { args };
		},
		template: `
		<div style="display: flex; justify-content: center; gap: 40px; padding: 100px;">
			<Popover placement="bottom" :width="200">
				<template #reference>
					<N8nButton label="200px width" />
				</template>
				<div style="padding: 12px;">
					<p style="margin: 0;">This popover has a fixed width of 200px.</p>
				</div>
			</Popover>
			<Popover placement="bottom" width="auto">
				<template #reference>
					<N8nButton label="Auto width" />
				</template>
				<div style="padding: 12px;">
					<p style="margin: 0;">Auto width</p>
				</div>
			</Popover>
			<Popover placement="bottom" :width="400">
				<template #reference>
					<N8nButton label="400px width" />
				</template>
				<div style="padding: 12px;">
					<p style="margin: 0;">This popover has a fixed width of 400px, allowing for more content to be displayed.</p>
				</div>
			</Popover>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const WithoutArrow = {
	render: (args) => ({
		components: { Popover, N8nButton },
		setup() {
			return { args };
		},
		template: `
		<div style="display: flex; justify-content: center; gap: 40px; padding: 100px;">
			<Popover placement="bottom" :show-arrow="true">
				<template #reference>
					<N8nButton label="With arrow" />
				</template>
				<div style="padding: 12px;">
					<p style="margin: 0;">Has arrow</p>
				</div>
			</Popover>
			<Popover placement="bottom" :show-arrow="false">
				<template #reference>
					<N8nButton label="Without arrow" />
				</template>
				<div style="padding: 12px;">
					<p style="margin: 0;">No arrow</p>
				</div>
			</Popover>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const CustomStyling = {
	render: (args) => ({
		components: { Popover, N8nButton },
		setup() {
			return { args };
		},
		template: `
		<div style="display: flex; justify-content: center; align-items: center; padding: 100px;">
			<Popover v-bind="args">
				<template #reference>
					<N8nButton label="Custom styled popover" />
				</template>
				<div style="padding: 16px;">
					<h4 style="margin: 0 0 8px 0;">Custom Content</h4>
					<p style="margin: 0; color: #666;">With custom styling applied via contentClass and contentStyle props.</p>
				</div>
			</Popover>
		</div>
		`,
	}),
	args: {
		placement: 'bottom',
		contentClass: 'custom-popover',
		contentStyle: { padding: '8px', borderRadius: '8px' },
		width: 280,
	},
} satisfies Story;

export const WithOffset = {
	render: (args) => ({
		components: { Popover, N8nButton },
		setup() {
			return { args };
		},
		template: `
		<div style="display: flex; justify-content: center; gap: 40px; padding: 100px;">
			<Popover placement="bottom" :offset="0">
				<template #reference>
					<N8nButton label="0px offset" />
				</template>
				<div style="padding: 12px;">No offset</div>
			</Popover>
			<Popover placement="bottom" :offset="12">
				<template #reference>
					<N8nButton label="12px offset" />
				</template>
				<div style="padding: 12px;">12px offset</div>
			</Popover>
			<Popover placement="bottom" :offset="24">
				<template #reference>
					<N8nButton label="24px offset" />
				</template>
				<div style="padding: 12px;">24px offset</div>
			</Popover>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const WithCloseFunction = {
	render: (args) => ({
		components: { Popover, N8nButton },
		setup() {
			return { args };
		},
		template: `
		<div style="display: flex; justify-content: center; align-items: center; padding: 100px;">
			<Popover v-bind="args">
				<template #reference>
					<N8nButton label="Click me" />
				</template>
				<template #default="{ close }">
					<div style="padding: 16px;">
						<p style="margin: 0 0 12px 0;">Click the button below to close the popover programmatically.</p>
						<N8nButton label="Close Popover" @click="close" />
					</div>
				</template>
			</Popover>
		</div>
		`,
	}),
	args: {
		placement: 'bottom',
		width: 280,
	},
} satisfies Story;
