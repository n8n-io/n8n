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
	type DialogContentProps,
} from '@n8n/design-system/components/N8nDialog';

const meta = {
	title: 'Components/N8nDialog',
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
								<N8nButton type="secondary" label="Cancel" />
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

export const AccessibilityFallback: Story = {
	render: (args: DialogContentProps) => ({
		components: {
			N8nDialogRoot,
			N8nDialogTrigger,
			N8nDialogPortal,
			N8nDialogOverlay,
			N8nDialogContent,
			N8nDialogFooter,
			N8nDialogClose,
			N8nButton,
		},
		setup() {
			return { args };
		},
		template: `
		<div style="display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 40px;">
			<p style="max-width: 500px; text-align: center; color: var(--color--text--tint-1);">
				This dialog uses <code>ariaLabel</code> and <code>ariaDescription</code> props instead of
				<code>N8nDialogTitle</code> and <code>N8nDialogDescription</code> components.
				The title and description are visually hidden but accessible to screen readers.
			</p>

			<N8nDialogRoot>
				<N8nDialogTrigger as-child>
					<N8nButton label="Open Dialog" />
				</N8nDialogTrigger>
				<N8nDialogPortal>
					<N8nDialogOverlay />
					<N8nDialogContent v-bind="args">
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
					</N8nDialogContent>
				</N8nDialogPortal>
			</N8nDialogRoot>
		</div>
		`,
	}),
	args: {
		ariaLabel: 'Delete Confirmation',
		ariaDescription: 'Are you sure you want to delete this item? This action cannot be undone.',
	},
} satisfies Story;

export const AccessibilityFallbackTitleOnly: Story = {
	render: (args: DialogContentProps) => ({
		components: {
			N8nDialogRoot,
			N8nDialogTrigger,
			N8nDialogPortal,
			N8nDialogOverlay,
			N8nDialogContent,
			N8nDialogFooter,
			N8nDialogClose,
			N8nButton,
		},
		setup() {
			return { args };
		},
		template: `
		<div style="display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 40px;">
			<p style="max-width: 500px; text-align: center; color: var(--color--text--tint-1);">
				This dialog only uses the <code>ariaLabel</code> prop for an accessible title.
				Useful for simple confirmation dialogs or icon-only interfaces.
			</p>

			<N8nDialogRoot>
				<N8nDialogTrigger as-child>
					<N8nButton label="Quick Action" variant="outline" />
				</N8nDialogTrigger>
				<N8nDialogPortal>
					<N8nDialogOverlay />
					<N8nDialogContent v-bind="args" size="small">
						<div style="text-align: center; padding: var(--spacing--md) 0;">
							<p>Complete this action?</p>
						</div>

						<N8nDialogFooter>
							<N8nDialogClose as-child>
								<N8nButton type="secondary" label="No" />
							</N8nDialogClose>
							<N8nButton label="Yes" />
						</N8nDialogFooter>
					</N8nDialogContent>
				</N8nDialogPortal>
			</N8nDialogRoot>
		</div>
		`,
	}),
	args: {
		ariaLabel: 'Confirm Action',
	},
} satisfies Story;
