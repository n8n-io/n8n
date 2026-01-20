import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import N8nButton from '@n8n/design-system/components/N8nButton/Button.vue';

import {
	N8nDialogRoot,
	N8nDialogTrigger,
	N8nDialogPortal,
	N8nDialogOverlay,
	N8nDialogContent,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nDialogClose,
	N8nAlertDialog,
	type DialogContentProps,
} from './index';

const meta = {
	title: 'Components v2/Dialog',
	component: N8nDialogContent,
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
} satisfies Meta<typeof N8nDialogContent>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args: DialogContentProps) => ({
		components: {
			N8nDialogRoot,
			N8nDialogTrigger,
			N8nDialogPortal,
			N8nDialogOverlay,
			N8nDialogContent,
			N8nDialogHeader,
			N8nDialogTitle,
			N8nDialogDescription,
			N8nDialogFooter,
			N8nDialogClose,
			N8nButton,
		},
		setup() {
			return { args };
		},
		template: `
		<div style="display: flex; justify-content: center; padding: 40px;">
			<N8nDialogRoot>
				<N8nDialogTrigger as-child>
					<N8nButton label="Open Dialog" />
				</N8nDialogTrigger>
				<N8nDialogPortal>
					<N8nDialogOverlay />
					<N8nDialogContent v-bind="args">
						<N8nDialogHeader>
							<N8nDialogTitle>Edit Profile</N8nDialogTitle>
							<N8nDialogDescription>
								Make changes to your profile here. Click save when you're done.
							</N8nDialogDescription>
						</N8nDialogHeader>

						<div style="padding: var(--spacing--sm) 0;">
							<p>Dialog content goes here...</p>
						</div>

						<N8nDialogFooter>
							<N8nDialogClose as-child>
								<N8nButton variant="secondary" label="Cancel" />
							</N8nDialogClose>
							<N8nButton label="Save changes" />
						</N8nDialogFooter>
					</N8nDialogContent>
				</N8nDialogPortal>
			</N8nDialogRoot>
		</div>
		`,
	}),
	args: {
		size: 'medium',
	},
} satisfies Story;

export const Sizes = {
	render: () => ({
		components: {
			N8nDialogRoot,
			N8nDialogTrigger,
			N8nDialogPortal,
			N8nDialogOverlay,
			N8nDialogContent,
			N8nDialogHeader,
			N8nDialogTitle,
			N8nDialogDescription,
			N8nDialogFooter,
			N8nDialogClose,
			N8nButton,
		},
		template: `
		<div style="display: flex; gap: 16px; justify-content: center; padding: 40px;">
			<N8nDialogRoot v-for="size in ['small', 'medium', 'large', 'xlarge', 'full', 'cover']" :key="size">
				<N8nDialogTrigger as-child>
					<N8nButton :label="size" variant="outline" />
				</N8nDialogTrigger>
				<N8nDialogPortal>
					<N8nDialogOverlay />
					<N8nDialogContent :size="size">
						<N8nDialogHeader>
							<N8nDialogTitle>{{ size }} Dialog</N8nDialogTitle>
							<N8nDialogDescription>
								This dialog has size="{{ size }}"
							</N8nDialogDescription>
						</N8nDialogHeader>

						<div style="padding: var(--spacing--sm) 0;">
							<p>Content for the {{ size }} dialog size variant.</p>
						</div>

						<N8nDialogFooter>
							<N8nDialogClose as-child>
								<N8nButton variant="outline" label="Close" />
							</N8nDialogClose>
						</N8nDialogFooter>
					</N8nDialogContent>
				</N8nDialogPortal>
			</N8nDialogRoot>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const WithoutCloseButton: Story = {
	render: (args: DialogContentProps) => ({
		components: {
			N8nDialogRoot,
			N8nDialogTrigger,
			N8nDialogPortal,
			N8nDialogOverlay,
			N8nDialogContent,
			N8nDialogHeader,
			N8nDialogTitle,
			N8nDialogDescription,
			N8nDialogFooter,
			N8nDialogClose,
			N8nButton,
		},
		setup() {
			return { args };
		},
		template: `
		<div style="display: flex; justify-content: center; padding: 40px;">
			<N8nDialogRoot>
				<N8nDialogTrigger as-child>
					<N8nButton label="Open Dialog" />
				</N8nDialogTrigger>
				<N8nDialogPortal>
					<N8nDialogOverlay />
					<N8nDialogContent v-bind="args">
						<N8nDialogHeader>
							<N8nDialogTitle>No Close Button</N8nDialogTitle>
							<N8nDialogDescription>
								This dialog doesn't have a close button in the top right corner.
							</N8nDialogDescription>
						</N8nDialogHeader>

						<N8nDialogFooter>
							<N8nDialogClose as-child>
								<N8nButton variant="outline" label="Cancel" />
							</N8nDialogClose>
							<N8nButton label="Confirm" />
						</N8nDialogFooter>
					</N8nDialogContent>
				</N8nDialogPortal>
			</N8nDialogRoot>
		</div>
		`,
	}),
	args: {
		showCloseButton: false,
	},
} satisfies Story;

export const ProgrammaticControl = {
	render: () => ({
		components: {
			N8nDialogRoot,
			N8nDialogTrigger,
			N8nDialogPortal,
			N8nDialogOverlay,
			N8nDialogContent,
			N8nDialogHeader,
			N8nDialogTitle,
			N8nDialogDescription,
			N8nDialogFooter,
			N8nButton,
		},
		setup() {
			const submitForm = async () => {
				return await new Promise<void>((resolve) => setTimeout(resolve, 1000));
			};
			return { submitForm };
		},
		template: `
		<div style="display: flex; justify-content: center; padding: 40px;">
			<N8nDialogRoot v-slot="{ close }">
				<N8nDialogTrigger as-child>
					<N8nButton label="Open Form" />
				</N8nDialogTrigger>
				<N8nDialogPortal>
					<N8nDialogOverlay />
					<N8nDialogContent>
						<N8nDialogHeader>
							<N8nDialogTitle>Submit Feedback</N8nDialogTitle>
							<N8nDialogDescription>
								Using slot props for programmatic close
							</N8nDialogDescription>
						</N8nDialogHeader>

						<form @submit.prevent="submitForm().then(close)">
							<div style="padding: var(--spacing--sm) 0;">
								<textarea
									placeholder="Enter your feedback..."
									style="width: 100%; min-height: 100px; padding: var(--spacing--2xs); border: var(--border); border-radius: var(--radius);"
								></textarea>
							</div>
							<N8nDialogFooter>
								<N8nButton variant="outline" type="button" label="Cancel" @click="close" />
								<N8nButton type="submit" label="Submit" />
							</N8nDialogFooter>
						</form>
					</N8nDialogContent>
				</N8nDialogPortal>
			</N8nDialogRoot>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const ScrollableContent = {
	render: () => ({
		components: {
			N8nDialogRoot,
			N8nDialogTrigger,
			N8nDialogPortal,
			N8nDialogOverlay,
			N8nDialogContent,
			N8nDialogHeader,
			N8nDialogTitle,
			N8nDialogFooter,
			N8nDialogClose,
			N8nButton,
		},
		template: `
		<div style="display: flex; justify-content: center; padding: 40px;">
			<N8nDialogRoot>
				<N8nDialogTrigger as-child>
					<N8nButton label="View Terms" variant="outline" />
				</N8nDialogTrigger>
				<N8nDialogPortal>
					<N8nDialogOverlay />
					<N8nDialogContent style="max-height: 80vh; display: flex; flex-direction: column;">
						<N8nDialogHeader>
							<N8nDialogTitle>Terms of Service</N8nDialogTitle>
						</N8nDialogHeader>

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
					</N8nDialogContent>
				</N8nDialogPortal>
			</N8nDialogRoot>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const ControlledState = {
	render: () => ({
		components: {
			N8nDialogRoot,
			N8nDialogPortal,
			N8nDialogOverlay,
			N8nDialogContent,
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
		<div style="display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 40px;">
			<p>Dialog is {{ isOpen ? 'open' : 'closed' }}</p>
			<N8nButton :label="isOpen ? 'Close Dialog' : 'Open Dialog'" @click="isOpen = !isOpen" />

			<N8nDialogRoot v-model:open="isOpen">
				<N8nDialogPortal>
					<N8nDialogOverlay />
					<N8nDialogContent>
						<N8nDialogHeader>
							<N8nDialogTitle>Controlled Dialog</N8nDialogTitle>
							<N8nDialogDescription>
								This dialog is controlled via v-model:open
							</N8nDialogDescription>
						</N8nDialogHeader>

						<N8nDialogFooter>
							<N8nDialogClose as-child>
								<N8nButton variant="outline" label="Close" />
							</N8nDialogClose>
						</N8nDialogFooter>
					</N8nDialogContent>
				</N8nDialogPortal>
			</N8nDialogRoot>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const AlertDialogBasic = {
	render: () => ({
		components: {
			N8nAlertDialog,
			N8nButton,
		},
		setup() {
			const handleConfirm = () => {
				console.log('Confirmed!');
			};
			return { handleConfirm };
		},
		template: `
		<div style="display: flex; justify-content: center; padding: 40px;">
			<N8nAlertDialog
				title="Save changes?"
				description="Your changes will be saved to the server."
				action-label="Save"
				@action="handleConfirm"
			>
				<template #trigger>
					<N8nButton label="Save" />
				</template>
			</N8nAlertDialog>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const AlertDialogDestructive = {
	render: () => ({
		components: {
			N8nAlertDialog,
			N8nButton,
		},
		setup() {
			const handleDelete = () => {
				console.log('Deleted!');
			};
			return { handleDelete };
		},
		template: `
		<div style="display: flex; justify-content: center; padding: 40px;">
			<N8nAlertDialog
				title="Delete item?"
				description="This action cannot be undone. This will permanently delete the item."
				action-label="Delete"
				action-variant="destructive"
				@action="handleDelete"
			>
				<template #trigger>
					<N8nButton label="Delete" variant="danger" />
				</template>
			</N8nAlertDialog>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const AlertDialogWithLoading = {
	render: () => ({
		components: {
			N8nAlertDialog,
			N8nButton,
		},
		setup() {
			const loading = ref(false);
			const isOpen = ref(false);

			const handleAction = async () => {
				loading.value = true;
				await new Promise((resolve) => setTimeout(resolve, 2000));
				loading.value = false;
				isOpen.value = false;
			};

			return { loading, isOpen, handleAction };
		},
		template: `
		<div style="display: flex; justify-content: center; padding: 40px;">
			<N8nAlertDialog
				v-model:open="isOpen"
				title="Process data?"
				description="This operation may take a few seconds."
				action-label="Process"
				:loading="loading"
				@action="handleAction"
			>
				<template #trigger>
					<N8nButton label="Start Process" />
				</template>
			</N8nAlertDialog>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const AlertDialogSizes = {
	render: () => ({
		components: {
			N8nAlertDialog,
			N8nButton,
		},
		template: `
		<div style="display: flex; gap: 16px; justify-content: center; padding: 40px;">
			<N8nAlertDialog
				title="Small Dialog"
				description="This is a small alert dialog."
				size="small"
			>
				<template #trigger>
					<N8nButton label="Small" variant="outline" />
				</template>
			</N8nAlertDialog>

			<N8nAlertDialog
				title="Medium Dialog"
				description="This is a medium alert dialog with more space for content."
				size="medium"
			>
				<template #trigger>
					<N8nButton label="Medium" variant="outline" />
				</template>
			</N8nAlertDialog>
		</div>
		`,
	}),
	args: {},
} satisfies Story;
