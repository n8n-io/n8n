import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import N8nButton from '@n8n/design-system/components/N8nButton/Button.vue';
import {
	N8nDialog,
	N8nDialogClose,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nDialogDescription,
	N8nDialogFooter,
	type DialogProps,
} from '@n8n/design-system/components/N8nDialog';

const meta = {
	title: 'Components/Dialog',
	// Use N8nDialog as component; docgen may have issues with reka-ui imports but types must match
	component: N8nDialog,
	parameters: {
		docs: {
			source: { type: 'dynamic' },
		},
	},
	argTypes: {
		size: {
			control: { type: 'select' },
			options: ['small', 'medium', 'large', 'xlarge', '2xlarge', 'fit', 'full', 'cover'],
		},
	},
} satisfies Meta<typeof N8nDialog>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args: DialogProps) => ({
		components: {
			N8nDialog,
			N8nDialogFooter,
			N8nDialogClose,
			N8nButton,
		},
		setup() {
			const isOpen = ref(false);
			return { args, isOpen };
		},
		template: `
		<div style="display: flex; justify-content: center; padding: 40px;">
			<N8nButton label="Open Dialog" @click="isOpen = true" />

			<N8nDialog v-model:open="isOpen" v-bind="args">
				<div style="padding: var(--spacing--sm) 0;">
					<p>Dialog content goes here...</p>
				</div>

				<N8nDialogFooter>
					<N8nDialogClose as-child>
						<N8nButton type="secondary" label="Cancel" />
					</N8nDialogClose>
					<N8nButton label="Save changes" />
				</N8nDialogFooter>
			</N8nDialog>
		</div>
		`,
	}),
	args: {
		size: 'medium',
		header: 'Edit Profile',
		description: "Make changes to your profile here. Click save when you're done.",
	},
} satisfies Story;

export const Sizes: Story = {
	render: () => ({
		components: {
			N8nDialog,
			N8nDialogFooter,
			N8nDialogClose,
			N8nButton,
		},
		setup() {
			const sizes = ['small', 'medium', 'large', 'xlarge', 'full', 'cover'] as const;
			const openDialogs = ref<Record<string, boolean>>({});
			const openDialog = (size: string) => {
				openDialogs.value[size] = true;
			};
			return { sizes, openDialogs, openDialog };
		},
		template: `
		<div style="display: flex; gap: 16px; justify-content: center; padding: 40px;">
			<template v-for="size in sizes" :key="size">
				<N8nButton :label="size" variant="outline" @click="openDialog(size)" />

				<N8nDialog
					v-model:open="openDialogs[size]"
					:size="size"
					:header="size + ' Dialog'"
					:description="'This dialog has size=' + size"
				>
					<div style="padding: var(--spacing--sm) 0;">
						<p>Content for the {{ size }} dialog size variant.</p>
					</div>

					<N8nDialogFooter>
						<N8nDialogClose as-child>
							<N8nButton variant="outline" label="Close" />
						</N8nDialogClose>
					</N8nDialogFooter>
				</N8nDialog>
			</template>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const WithoutCloseButton: Story = {
	render: (args: DialogProps) => ({
		components: {
			N8nDialog,
			N8nDialogFooter,
			N8nDialogClose,
			N8nButton,
		},
		setup() {
			const isOpen = ref(false);
			return { args, isOpen };
		},
		template: `
		<div style="display: flex; justify-content: center; padding: 40px;">
			<N8nButton label="Open Dialog" @click="isOpen = true" />

			<N8nDialog v-model:open="isOpen" v-bind="args">
				<N8nDialogFooter>
					<N8nDialogClose as-child>
						<N8nButton variant="outline" label="Cancel" />
					</N8nDialogClose>
					<N8nButton label="Confirm" />
				</N8nDialogFooter>
			</N8nDialog>
		</div>
		`,
	}),
	args: {
		showCloseButton: false,
		header: 'No Close Button',
		description: "This dialog doesn't have a close button in the top right corner.",
	},
} satisfies Story;

export const ScrollableContent: Story = {
	render: () => ({
		components: {
			N8nDialog,
			N8nDialogFooter,
			N8nDialogClose,
			N8nButton,
		},
		setup() {
			const isOpen = ref(false);
			return { isOpen };
		},
		template: `
		<div style="display: flex; justify-content: center; padding: 40px;">
			<N8nButton label="View Terms" variant="outline" @click="isOpen = true" />

			<N8nDialog
				v-model:open="isOpen"
				header="Terms of Service"
				style="max-height: 80vh; display: flex; flex-direction: column;"
			>
				<div style="flex: 1; overflow-y: auto; padding: var(--spacing--sm);">
					<p v-for="i in 20" :key="i" style="margin-bottom: var(--spacing--sm);">
						Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
						tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
						veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
						commodo consequat.
					</p>
				</div>

				<N8nDialogFooter>
					<N8nDialogClose as-child>
						<N8nButton variant="outline" label="Decline" />
					</N8nDialogClose>
					<N8nButton label="Accept" />
				</N8nDialogFooter>
			</N8nDialog>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const AccessibilityFallback: Story = {
	render: (args: DialogProps) => ({
		components: {
			N8nDialog,
			N8nDialogFooter,
			N8nDialogClose,
			N8nButton,
		},
		setup() {
			const isOpen = ref(false);
			return { args, isOpen };
		},
		template: `
		<div style="display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 40px;">
			<p style="max-width: 500px; text-align: center; color: var(--color--text--tint-1);">
				This dialog uses <code>ariaLabel</code> and <code>ariaDescription</code> props instead of
				<code>N8nDialogTitle</code> and <code>N8nDialogDescription</code> components.
				The title and description are visually hidden but accessible to screen readers.
			</p>

			<N8nButton label="Open Dialog" @click="isOpen = true" />

			<N8nDialog v-model:open="isOpen" v-bind="args">
				<div style="padding: var(--spacing--sm) 0;">
					<p style="font-weight: var(--font-weight--bold); margin-bottom: var(--spacing--xs);">
						Custom Visual Title
					</p>
					<p>
						This dialog has no visible DialogTitle or DialogDescription components,
						but screen readers will announce "Delete Confirmation" as the title
						and the description text for accessibility.
					</p>
				</div>

				<N8nDialogFooter>
					<N8nDialogClose as-child>
						<N8nButton type="secondary" label="Cancel" />
					</N8nDialogClose>
					<N8nButton type="danger" label="Delete" />
				</N8nDialogFooter>
			</N8nDialog>
		</div>
		`,
	}),
	args: {
		ariaLabel: 'Delete Confirmation',
		ariaDescription: 'Are you sure you want to delete this item? This action cannot be undone.',
	},
} satisfies Story;

export const AccessibilityFallbackTitleOnly: Story = {
	render: (args: DialogProps) => ({
		components: {
			N8nDialog,
			N8nDialogFooter,
			N8nDialogClose,
			N8nButton,
		},
		setup() {
			const isOpen = ref(false);
			return { args, isOpen };
		},
		template: `
		<div style="display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 40px;">
			<p style="max-width: 500px; text-align: center; color: var(--color--text--tint-1);">
				This dialog only uses the <code>ariaLabel</code> prop for an accessible title.
				Useful for simple confirmation dialogs or icon-only interfaces.
			</p>

			<N8nButton label="Quick Action" variant="outline" @click="isOpen = true" />

			<N8nDialog v-model:open="isOpen" v-bind="args" size="small">
				<div style="text-align: center; padding: var(--spacing--md) 0;">
					<p>Complete this action?</p>
				</div>

				<N8nDialogFooter>
					<N8nDialogClose as-child>
						<N8nButton type="secondary" label="No" />
					</N8nDialogClose>
					<N8nButton label="Yes" />
				</N8nDialogFooter>
			</N8nDialog>
		</div>
		`,
	}),
	args: {
		ariaLabel: 'Confirm Action',
	},
} satisfies Story;

/**
 * You can use child components for custom header layouts instead of the header/description props.
 */
export const CustomHeader: Story = {
	render: () => ({
		components: {
			N8nDialog,
			N8nDialogHeader,
			N8nDialogTitle,
			N8nDialogDescription,
			N8nDialogFooter,
			N8nDialogClose,
			N8nButton,
		},
		setup() {
			const isOpen = ref(false);
			return { isOpen };
		},
		template: `
		<div style="display: flex; justify-content: center; padding: 40px;">
			<N8nButton label="Open Dialog" @click="isOpen = true" />

			<N8nDialog v-model:open="isOpen">
				<N8nDialogHeader>
					<N8nDialogTitle>Custom Header Layout</N8nDialogTitle>
					<N8nDialogDescription>
						Use child components when you need more control over the header layout,
						such as adding icons, badges, or custom styling.
					</N8nDialogDescription>
				</N8nDialogHeader>

				<div style="padding: var(--spacing--sm) 0;">
					<p>Dialog content goes here...</p>
				</div>

				<N8nDialogFooter>
					<N8nDialogClose as-child>
						<N8nButton type="secondary" label="Cancel" />
					</N8nDialogClose>
					<N8nButton label="Save" />
				</N8nDialogFooter>
			</N8nDialog>
		</div>
		`,
	}),
	args: {},
} satisfies Story;
