import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import {
	N8nDialog,
	N8nDialogBody,
	N8nDialogClose,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nDialogDescription,
	N8nDialogFooter,
	type DialogProps,
} from './index';
import N8nButton from '../N8nButton/Button.vue';
import N8nCheckbox from '../../v2/components/Checkbox/Checkbox.vue';
import N8nInput from '../N8nInput/Input.vue';
import N8nInputLabel from '../N8nInputLabel/InputLabel.vue';
import N8nSwitch2 from '../N8nSwitch/Switch.vue';
import N8nSelect2 from '../../v2/components/Select/Select.vue';

const meta = {
	title: 'Core/Dialog',
	// Use N8nDialog as component; docgen may have issues with reka-ui imports but types must match
	component: N8nDialog,
	parameters: {
		docs: {
			description: { component: 'A modal container for focused tasks and decisions.' },
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
			N8nDialogBody,
			N8nDialogFooter,
			N8nDialogClose,
			N8nButton,
		},
		setup() {
			const isOpen = ref(false);
			return { args, isOpen };
		},
		template: `
		<div>
			<N8nButton label="Open Dialog" @click="isOpen = true" />

			<N8nDialog v-model:open="isOpen" v-bind="args">
				<N8nDialogBody>
					<p>Dialog content goes here...</p>
				</N8nDialogBody>

				<N8nDialogFooter>
					<N8nDialogClose as-child>
						<N8nButton label="Cancel" />
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
			N8nDialogBody,
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
		<div style="display: flex; gap: 16px;">
			<template v-for="size in sizes" :key="size">
				<N8nButton :label="size" variant="outline" @click="openDialog(size)" />

				<N8nDialog
					v-model:open="openDialogs[size]"
					:size="size"
					:header="size + ' Dialog'"
					:description="'This dialog has size=' + size"
				>
					<N8nDialogBody>
						<p>Content for the {{ size }} dialog size variant.</p>
					</N8nDialogBody>

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
		<div>
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
			N8nDialogBody,
			N8nDialogFooter,
			N8nDialogClose,
			N8nButton,
		},
		setup() {
			const isOpen = ref(false);
			return { isOpen };
		},
		template: `
		<div>
			<N8nButton label="View Terms" variant="outline" @click="isOpen = true" />

			<N8nDialog
				v-model:open="isOpen"
				header="Terms of Service"
				style="max-height: 80vh; display: flex; flex-direction: column;"
			>
				<N8nDialogBody>
				<div style="flex: 1; overflow-y: auto;">
					<p v-for="i in 20" :key="i" style="margin-bottom: var(--spacing--sm);">
						Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
						tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
						veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
						commodo consequat.
					</p>
				</div>
				</N8nDialogBody>

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
			N8nDialogBody,
			N8nDialogFooter,
			N8nDialogClose,
			N8nButton,
		},
		setup() {
			const isOpen = ref(false);
			return { args, isOpen };
		},
		template: `
		<div style="display: flex; flex-direction: column; gap: 16px">
			<p style="max-width: 500px; color: var(--color--text--tint-1);">
				This dialog uses <code>ariaLabel</code> and <code>ariaDescription</code> props instead of
				<code>N8nDialogTitle</code> and <code>N8nDialogDescription</code> components.
				The title and description are visually hidden but accessible to screen readers.
			</p>

			<N8nButton label="Open Dialog" @click="isOpen = true" />

			<N8nDialog v-model:open="isOpen" v-bind="args">
				<N8nDialogBody>
					<div>
						<p style="font-weight: var(--font-weight--bold); margin-bottom: var(--spacing--xs);">
							Custom Visual Title
						</p>
						<p>
							This dialog has no visible DialogTitle or DialogDescription components,
							but screen readers will announce "Delete Confirmation" as the title
							and the description text for accessibility.
						</p>
					</div>
				</N8nDialogBody>

				<N8nDialogFooter>
					<N8nDialogClose as-child>
						<N8nButton label="Cancel" />
					</N8nDialogClose>
					<N8nButton label="Delete" />
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
			N8nDialogBody,
			N8nDialogFooter,
			N8nDialogClose,
			N8nButton,
		},
		setup() {
			const isOpen = ref(false);
			return { args, isOpen };
		},
		template: `
		<div style="display: flex; flex-direction: column; gap: 16px">
			<p style="max-width: 500px; color: var(--color--text--tint-1);">
				This dialog only uses the <code>ariaLabel</code> prop for an accessible title.
				Useful for simple confirmation dialogs or icon-only interfaces.
			</p>

			<N8nButton label="Quick Action" variant="outline" @click="isOpen = true" />

			<N8nDialog v-model:open="isOpen" v-bind="args" size="small">
				<N8nDialogBody>
					<div style="text-align: center;">
						<p>Complete this action?</p>
					</div>
				</N8nDialogBody>

				<N8nDialogFooter>
					<N8nDialogClose as-child>
						<N8nButton label="No" />
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
			N8nDialogBody,
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
		<div>
			<N8nButton label="Open Dialog" @click="isOpen = true" />

			<N8nDialog v-model:open="isOpen">
				<N8nDialogHeader>
					<N8nDialogTitle>Custom Header Layout</N8nDialogTitle>
					<N8nDialogDescription>
						Use child components when you need more control over the header layout,
						such as adding icons, badges, or custom styling.
					</N8nDialogDescription>
				</N8nDialogHeader>

				<N8nDialogBody>
					<p>Dialog content goes here...</p>
				</N8nDialogBody>

				<N8nDialogFooter>
					<N8nDialogClose as-child>
						<N8nButton label="Cancel" />
					</N8nDialogClose>
					<N8nButton label="Save" />
				</N8nDialogFooter>
			</N8nDialog>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

const roleItems = [
	{ label: 'Admin', value: 'admin' },
	{ label: 'Member', value: 'member' },
	{ label: 'Viewer', value: 'viewer' },
];

export const Form: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'A dialog with form fields. Tab moves through the fields and actions, then the close button.',
			},
		},
	},
	render: () => ({
		components: {
			N8nDialog,
			N8nDialogBody,
			N8nDialogFooter,
			N8nDialogClose,
			N8nButton,
			N8nCheckbox,
			N8nInput,
			N8nInputLabel,
			N8nSelect2,
			N8nSwitch2,
		},
		setup() {
			const isOpen = ref(false);
			const name = ref('');
			const email = ref('');
			const role = ref<string | undefined>();
			const notes = ref('');
			const notify = ref(true);
			const active = ref(false);

			function onSubmit(event: Event) {
				event.preventDefault();
				isOpen.value = false;
			}

			return { isOpen, name, email, role, notes, notify, active, roleItems, onSubmit };
		},
		template: `
		<div>
			<N8nButton label="Edit profile" @click="isOpen = true" />

			<N8nDialog
				v-model:open="isOpen"
				header="Edit profile"
				description="Update the details for this profile."
			>
				<N8nDialogBody>
					<form
						id="dialog-profile-form"
						style="display: flex; flex-direction: column; gap: var(--spacing--md);"
						@submit="onSubmit"
					>
						<N8nInputLabel label="Name" required>
							<N8nInput v-model="name" name="name" placeholder="Ada Lovelace" size="small" />
						</N8nInputLabel>

						<N8nInputLabel label="Email">
							<N8nInput
								v-model="email"
								name="email"
								type="email"
								placeholder="ada@example.com"
								size="small"
							/>
						</N8nInputLabel>

						<N8nInputLabel label="Role">
							<N8nSelect2
								v-model="role"
								:items="roleItems"
								placeholder="Select a role"
								clearable
							/>
						</N8nInputLabel>

						<N8nInputLabel label="Notes">
							<N8nInput
								v-model="notes"
								name="notes"
								type="textarea"
								placeholder="Add a note"
								:rows="3"
							/>
						</N8nInputLabel>

						<N8nCheckbox v-model="notify" label="Send a confirmation email" />
						<N8nSwitch2 v-model="active" label="Active" />
					</form>
				</N8nDialogBody>

				<N8nDialogFooter>
					<N8nDialogClose as-child>
						<N8nButton variant="outline" label="Cancel" />
					</N8nDialogClose>
					<N8nButton type="submit" form="dialog-profile-form" label="Save" />
				</N8nDialogFooter>
			</N8nDialog>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const NoCloseOnOverlayClick: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'Set closeOnOverlayClick to false. A click on the overlay leaves the dialog open. Escape and the close button still close it.',
			},
		},
	},
	render: (args: DialogProps) => ({
		components: {
			N8nDialog,
			N8nDialogBody,
			N8nDialogFooter,
			N8nDialogClose,
			N8nButton,
		},
		setup() {
			const isOpen = ref(false);
			return { args, isOpen };
		},
		template: `
		<div>
			<N8nButton label="Open dialog" @click="isOpen = true" />

			<N8nDialog v-model:open="isOpen" v-bind="args">
				<N8nDialogBody>
					<p>Click the overlay. This dialog stays open.</p>
				</N8nDialogBody>

				<N8nDialogFooter>
					<N8nDialogClose as-child>
						<N8nButton variant="outline" label="Close" />
					</N8nDialogClose>
				</N8nDialogFooter>
			</N8nDialog>
		</div>
		`,
	}),
	args: {
		size: 'medium',
		header: 'Keep this open',
		closeOnOverlayClick: false,
	},
} satisfies Story;
