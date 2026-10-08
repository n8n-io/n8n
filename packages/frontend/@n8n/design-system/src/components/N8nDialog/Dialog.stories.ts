import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { nextTick, ref, watch } from 'vue';

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
import { N8nAlertDialog } from '../N8nAlertDialog';
import N8nButton from '../N8nButton/Button.vue';
import N8nCallout from '../N8nCallout/Callout.vue';
import N8nIcon from '../N8nIcon/Icon.vue';
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

const contentPlaceholder = `
<div style="display: flex; flex: 1; align-items: center; justify-content: center; min-height: var(--spacing--4xl); padding: var(--spacing--md); border-radius: var(--radius); background-color: var(--color--background); color: var(--color--text--tint-1);">
	Content goes here
</div>
`;

export const Default: Story = {
	render: (args: DialogProps) => ({
		components: {
			N8nDialog,
			N8nDialogBody,
			N8nDialogDescription,
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
			<N8nButton variant="solid" label="Open Dialog" @click="isOpen = true" />

			<N8nDialog v-model:open="isOpen" v-bind="args">
				<N8nDialogBody>
					<N8nDialogDescription>Make changes to your profile here. Click save when you're done.</N8nDialogDescription>
					${contentPlaceholder}
				</N8nDialogBody>

				<N8nDialogFooter>
					<N8nDialogClose as-child>
						<N8nButton variant="outline" label="Cancel" />
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
	},
} satisfies Story;

/**
 * A long title wraps onto more than one line. The close button stays on the first line.
 */
export const MultilineTitle: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'A long title wraps onto more than one line. The close button stays aligned with the first line.',
			},
		},
	},
	render: (args: DialogProps) => ({
		components: {
			N8nDialog,
			N8nDialogBody,
			N8nDialogDescription,
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
			<N8nButton variant="solid" label="Open Dialog" @click="isOpen = true" />

			<N8nDialog v-model:open="isOpen" v-bind="args">
				<N8nDialogBody>
					<N8nDialogDescription>The title wraps. The close button stays on the first line.</N8nDialogDescription>
					${contentPlaceholder}
				</N8nDialogBody>

				<N8nDialogFooter>
					<N8nDialogClose as-child>
						<N8nButton variant="outline" label="Cancel" />
					</N8nDialogClose>
					<N8nButton label="Save changes" />
				</N8nDialogFooter>
			</N8nDialog>
		</div>
		`,
	}),
	args: {
		size: 'medium',
		header: 'Review the workflow settings before you publish this version to the team',
	},
} satisfies Story;

export const Sizes: Story = {
	render: () => ({
		components: {
			N8nDialog,
			N8nDialogBody,
			N8nDialogDescription,
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
				<N8nButton variant="solid" :label="size" @click="openDialog(size)" />

				<N8nDialog
					v-model:open="openDialogs[size]"
					:size="size"
					:header="size + ' Dialog'"
				>
					<N8nDialogBody>
						<N8nDialogDescription>This dialog has size={{ size }}</N8nDialogDescription>
						${contentPlaceholder}
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
			N8nDialogBody,
			N8nDialogDescription,
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
			<N8nButton variant="solid" label="Open Dialog" @click="isOpen = true" />

			<N8nDialog v-model:open="isOpen" v-bind="args">
				<N8nDialogBody>
					<N8nDialogDescription>This dialog does not have a close button in the top right corner.</N8nDialogDescription>
					${contentPlaceholder}
				</N8nDialogBody>
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
	},
} satisfies Story;

/**
 * No title row. The body keeps top padding so the content is not flush with the dialog edge.
 * A centered icon is the usual content for this layout.
 */
export const WithoutHeader: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'Dialogs with a close button and no header. Use a centered icon when the message is a status or a short confirmation.',
			},
		},
	},
	render: (args: DialogProps) => ({
		components: {
			N8nDialog,
			N8nDialogBody,
			N8nDialogDescription,
			N8nDialogFooter,
			N8nDialogClose,
			N8nButton,
			N8nIcon,
		},
		setup() {
			const isOpen = ref(false);
			const isIconOpen = ref(false);
			return { args, isOpen, isIconOpen };
		},
		template: `
		<div style="display: flex; gap: var(--spacing--sm);">
			<N8nButton variant="solid" label="Text" @click="isOpen = true" />
			<N8nButton variant="solid" label="Icon" @click="isIconOpen = true" />

			<N8nDialog v-model:open="isOpen" v-bind="args">
				<N8nDialogBody>
					<N8nDialogDescription>This dialog has no header. The close button stays in the corner.</N8nDialogDescription>
					${contentPlaceholder}
				</N8nDialogBody>

				<N8nDialogFooter>
					<N8nDialogClose as-child>
						<N8nButton variant="outline" label="Close" />
					</N8nDialogClose>
				</N8nDialogFooter>
			</N8nDialog>

			<N8nDialog v-model:open="isIconOpen" size="small" aria-label="Workflow published">
				<N8nDialogBody>
					<div style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--spacing--sm);">
						<N8nIcon icon="circle-check" size="xxlarge" />
						<N8nDialogDescription style="margin: 0; text-wrap: balance;">
							The workflow is published and ready for the team.
						</N8nDialogDescription>
					</div>
				</N8nDialogBody>

				<N8nDialogFooter style="flex-direction: column;">
					<N8nDialogClose as-child>
						<N8nButton variant="solid" label="Done" style="width: 100%;" />
					</N8nDialogClose>
				</N8nDialogFooter>
			</N8nDialog>
		</div>
		`,
	}),
	args: {
		size: 'medium',
		ariaLabel: 'Notice',
	},
} satisfies Story;

/**
 * No header. The actions stack and each button fills the footer.
 */
export const StackedButtons: Story = {
	parameters: {
		docs: {
			description: {
				story: 'A dialog with no header and stacked, full-width actions.',
			},
		},
	},
	render: () => ({
		components: {
			N8nDialog,
			N8nDialogBody,
			N8nDialogDescription,
			N8nDialogFooter,
			N8nDialogClose,
			N8nButton,
			N8nIcon,
		},
		setup() {
			const isOpen = ref(false);
			return { isOpen };
		},
		template: `
		<div>
			<N8nButton variant="solid" label="Open Dialog" @click="isOpen = true" />

			<N8nDialog v-model:open="isOpen" size="small" aria-label="Delete workflow">
				<N8nDialogBody>
					<div style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--spacing--sm);">
						<N8nIcon icon="triangle-alert" color="danger" size="xxlarge" />
						<N8nDialogDescription style="margin: 0; text-wrap: balance;">
							Delete this workflow? This cannot be undone.
						</N8nDialogDescription>
					</div>
				</N8nDialogBody>

				<N8nDialogFooter style="flex-direction: column;">
					<N8nDialogClose as-child>
						<N8nButton variant="destructive" label="Delete" style="width: 100%;" />
					</N8nDialogClose>
					<N8nDialogClose as-child>
						<N8nButton variant="outline" label="Cancel" style="width: 100%;" />
					</N8nDialogClose>
				</N8nDialogFooter>
			</N8nDialog>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const ScrollableContent: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'The body scrolls and the header and footer stay in place. Height examples set a smaller max height. Size examples use a dialog size, including cover.',
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
		},
		setup() {
			const examples = [
				{ id: 'full', label: 'Full height' },
				{ id: '70vh', label: '70vh', maxHeight: '70vh' },
				{ id: '50vh', label: '50vh', maxHeight: '50vh' },
				{ id: '30vh', label: '30vh', maxHeight: '30vh' },
				{ id: 'small', label: 'Small', size: 'small' },
				{ id: 'medium', label: 'Medium', size: 'medium' },
				{ id: 'large', label: 'Large', size: 'large' },
				{ id: 'xlarge', label: 'XLarge', size: 'xlarge' },
				{ id: 'full-size', label: 'Full', size: 'full' },
				{ id: 'cover', label: 'Cover', size: 'cover' },
			] as const;
			const openDialogs = ref<Record<string, boolean>>({});
			const openDialog = (id: string) => {
				openDialogs.value[id] = true;
			};
			return { examples, openDialogs, openDialog };
		},
		template: `
		<div style="display: flex; flex-wrap: wrap; gap: var(--spacing--sm);">
			<template v-for="example in examples" :key="example.id">
				<N8nButton variant="solid" :label="example.label" @click="openDialog(example.id)" />

				<N8nDialog
					v-model:open="openDialogs[example.id]"
					:size="example.size || 'medium'"
					:header="'Terms of Service (' + example.label + ')'"
					:style="example.maxHeight ? { maxHeight: example.maxHeight } : undefined"
				>
					<N8nDialogBody>
						<p
							v-for="i in 20"
							:key="i"
							:style="i < 20 ? 'margin: 0 0 var(--spacing--sm)' : 'margin: 0'"
						>
							Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
							tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
							veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
							commodo consequat.
						</p>
					</N8nDialogBody>

					<N8nDialogFooter>
						<N8nDialogClose as-child>
							<N8nButton variant="outline" label="Decline" />
						</N8nDialogClose>
						<N8nButton label="Accept" />
					</N8nDialogFooter>
				</N8nDialog>
			</template>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

/**
 * Fades mark more content above and below the scroll area.
 */
export const ScrollFades: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'The top fade appears after you scroll. The bottom fade stays while more content is below, and it disappears at the end.',
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
		},
		setup() {
			const isOpen = ref(false);
			const scroller = ref<HTMLElement | null>(null);
			const showTopFade = ref(false);
			const showBottomFade = ref(false);

			function updateFades() {
				const element = scroller.value;
				if (!element) return;

				showTopFade.value = element.scrollTop > 1;
				showBottomFade.value = element.scrollTop + element.clientHeight < element.scrollHeight - 1;
			}

			watch(isOpen, async (open) => {
				if (!open) return;
				await nextTick();
				requestAnimationFrame(() => {
					updateFades();
				});
			});

			return { isOpen, scroller, showTopFade, showBottomFade, updateFades };
		},
		template: `
		<div>
			<N8nButton variant="solid" label="Open Dialog" @click="isOpen = true" />

			<N8nDialog v-model:open="isOpen" header="Release notes" size="medium" style="max-height: 50vh;">
				<N8nDialogBody style="padding: 0; overflow: hidden;">
					<div style="position: relative; display: flex; flex: 1; min-height: 0; --dialog-fade: light-dark(var(--color--neutral-white), var(--color--neutral-800));">
						<div
							ref="scroller"
							style="flex: 1; min-height: 0; overflow: auto; padding: var(--n8n-dialog-region--padding, var(--spacing--md));"
							@scroll="updateFades"
						>
							<p
								v-for="i in 16"
								:key="i"
								:style="i < 16 ? 'margin: 0 0 var(--spacing--sm)' : 'margin: 0'"
							>
								Version notes for this release. Scroll to read the changes. The fades show when more text sits above or below this area.
							</p>
						</div>
						<div
							v-show="showTopFade"
							aria-hidden="true"
							style="position: absolute; top: 0; right: 0; left: 0; height: var(--spacing--xl); pointer-events: none; background: linear-gradient(to bottom, var(--dialog-fade) 0%, color-mix(in srgb, var(--dialog-fade) 0%, transparent) 100%);"
						></div>
						<div
							v-show="showBottomFade"
							aria-hidden="true"
							style="position: absolute; right: 0; bottom: 0; left: 0; height: var(--spacing--xl); pointer-events: none; background: linear-gradient(to top, var(--dialog-fade) 0%, color-mix(in srgb, var(--dialog-fade) 0%, transparent) 100%);"
						></div>
					</div>
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
	args: {},
} satisfies Story;

/**
 * The actions sit at the end of the body, so the reader scrolls the terms to reach them.
 */
export const NonStickyFooter: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'Place the actions inside the body. They scroll with the terms. The reader reaches them at the end.',
			},
		},
	},
	render: () => ({
		components: {
			N8nDialog,
			N8nDialogBody,
			N8nDialogClose,
			N8nButton,
		},
		setup() {
			const isOpen = ref(false);
			return { isOpen };
		},
		template: `
		<div>
			<N8nButton variant="solid" label="Open Dialog" @click="isOpen = true" />

			<N8nDialog v-model:open="isOpen" header="Terms of Service" size="medium" style="max-height: 50vh;">
				<N8nDialogBody>
					<p
						v-for="i in 12"
						:key="i"
						style="margin: 0 0 var(--spacing--sm)"
					>
						Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
						tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
						veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
						commodo consequat.
					</p>
					<div style="display: flex; justify-content: flex-end; gap: var(--spacing--2xs);">
						<N8nDialogClose as-child>
							<N8nButton variant="outline" label="Decline" />
						</N8nDialogClose>
						<N8nButton label="Agree" />
					</div>
				</N8nDialogBody>
			</N8nDialog>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

/**
 * The dialog stays fixed. Only the marked regions scroll.
 */
export const Sidebar: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'The dialog does not scroll. Set overflow on the regions that should scroll. The sidebar and the main area scroll on their own. The header and the footer stay in place.',
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
		},
		setup() {
			const isOpen = ref(false);
			const sections = [
				'General',
				'Execution',
				'Error handling',
				'Credentials',
				'Sharing',
				'History',
				'Notifications',
				'Timezone',
				'Data retention',
				'Security',
				'Audit log',
				'Advanced',
				'Appearance',
				'Language',
				'API',
				'Webhooks',
				'Variables',
				'Environments',
				'Permissions',
				'Usage',
			];
			return { isOpen, sections };
		},
		template: `
		<div>
			<N8nButton variant="solid" label="Open Dialog" @click="isOpen = true" />

			<N8nDialog v-model:open="isOpen" header="Workflow settings" size="2xlarge" style="max-height: 70vh;">
				<N8nDialogBody style="padding: 0; overflow: hidden; border-block: var(--border);">
					<div style="display: flex; flex: 1; min-height: 0; overflow: hidden;">
						<nav
							aria-label="Settings sections"
							style="display: flex; flex: 0 0 calc(var(--spacing--4xl) + var(--spacing--3xl)); flex-direction: column; gap: var(--spacing--5xs); min-height: 0; overflow: auto; padding: var(--spacing--xs); border-inline-end: var(--border);"
						>
							<button
								v-for="(section, index) in sections"
								:key="section"
								type="button"
								:style="index === 0
									? 'padding: var(--spacing--2xs) var(--spacing--xs); border: 0; border-radius: var(--radius); background-color: var(--color--background); color: var(--color--text); font: inherit; font-size: var(--font-size--sm); line-height: var(--line-height--sm); text-align: start; cursor: pointer;'
									: 'padding: var(--spacing--2xs) var(--spacing--xs); border: 0; border-radius: var(--radius); background: transparent; color: var(--color--text); font: inherit; font-size: var(--font-size--sm); line-height: var(--line-height--sm); text-align: start; cursor: pointer;'"
							>
								{{ section }}
							</button>
						</nav>

						<div style="flex: 1; min-height: 0; overflow: auto; padding: var(--n8n-dialog-region--padding, var(--spacing--md));">
							<p
								v-for="i in 12"
								:key="i"
								:style="i < 12 ? 'margin: 0 0 var(--spacing--sm)' : 'margin: 0'"
							>
								General settings control how this workflow runs. Change the name, the timezone, and the error behavior here. These paragraphs are long so this region scrolls on its own.
							</p>
						</div>
					</div>
				</N8nDialogBody>

				<N8nDialogFooter>
					<N8nDialogClose as-child>
						<N8nButton variant="outline" label="Cancel" />
					</N8nDialogClose>
					<N8nButton label="Save" />
				</N8nDialogFooter>
			</N8nDialog>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

/**
 * A callout sits at the top of the body in place of a description.
 */
export const WithCallout: Story = {
	parameters: {
		docs: {
			description: {
				story: 'A warning callout replaces the description at the top of the body.',
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
			N8nCallout,
		},
		setup() {
			const isOpen = ref(false);
			return { isOpen };
		},
		template: `
		<div>
			<N8nButton variant="solid" label="Open Dialog" @click="isOpen = true" />

			<N8nDialog v-model:open="isOpen" header="Publish workflow" size="medium">
				<N8nDialogBody>
					<N8nCallout theme="warning" style="margin: 0 0 var(--spacing--sm);">
						This workflow is shared. Publishing it updates the version the team uses.
					</N8nCallout>
					${contentPlaceholder}
				</N8nDialogBody>

				<N8nDialogFooter>
					<N8nDialogClose as-child>
						<N8nButton variant="outline" label="Cancel" />
					</N8nDialogClose>
					<N8nButton label="Publish" />
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

			<N8nButton variant="solid" label="Open Dialog" @click="isOpen = true" />

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
						<N8nButton variant="subtle" label="Cancel" />
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

			<N8nButton variant="solid" label="Quick Action" @click="isOpen = true" />

			<N8nDialog v-model:open="isOpen" v-bind="args" size="small">
				<N8nDialogBody>
					<p>Complete this action?</p>
				</N8nDialogBody>

				<N8nDialogFooter>
					<N8nDialogClose as-child>
						<N8nButton variant="subtle" label="No" />
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
 * You can use child components for a custom header instead of the header prop.
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
			<N8nButton variant="solid" label="Open Dialog" @click="isOpen = true" />

			<N8nDialog v-model:open="isOpen">
				<N8nDialogHeader>
					<N8nDialogTitle>Custom Header Layout</N8nDialogTitle>
				</N8nDialogHeader>

				<N8nDialogBody>
					<N8nDialogDescription>
						Use child components when you need more control over the header layout,
						such as adding icons, badges, or custom styling.
					</N8nDialogDescription>
					${contentPlaceholder}
				</N8nDialogBody>

				<N8nDialogFooter>
					<N8nDialogClose as-child>
						<N8nButton variant="outline" label="Cancel" />
					</N8nDialogClose>
					<N8nButton label="Save" />
				</N8nDialogFooter>
			</N8nDialog>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

/**
 * Compose the footer when it needs more than actions, such as a status line beside the buttons.
 */
export const CustomFooter: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'A dialog with a custom footer. The body has no bottom padding, because the footer supplies that space.',
			},
		},
	},
	render: () => ({
		components: {
			N8nDialog,
			N8nDialogBody,
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
			<N8nButton variant="solid" label="Open Dialog" @click="isOpen = true" />

			<N8nDialog v-model:open="isOpen" header="Publish workflow" size="medium">
				<N8nDialogBody>
					<N8nDialogDescription>
						Review the workflow, then publish it for the team.
					</N8nDialogDescription>
					${contentPlaceholder}
				</N8nDialogBody>

				<N8nDialogFooter>
					<span style="margin-inline-end: auto; align-self: center; font-size: var(--font-size--sm); line-height: var(--line-height--sm); color: var(--color--text--tint-1);">
						Last saved 2 minutes ago
					</span>
					<N8nDialogClose as-child>
						<N8nButton variant="outline" label="Cancel" />
					</N8nDialogClose>
					<N8nButton label="Publish" />
				</N8nDialogFooter>
			</N8nDialog>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

/**
 * One action sits on the left. Two actions sit on the right.
 */
export const SplitFooter: Story = {
	parameters: {
		docs: {
			description: {
				story: 'One action sits on the left. Two actions sit on the right.',
			},
		},
	},
	render: () => ({
		components: {
			N8nDialog,
			N8nDialogBody,
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
			<N8nButton variant="solid" label="Open Dialog" @click="isOpen = true" />

			<N8nDialog v-model:open="isOpen" header="Edit workflow" size="medium">
				<N8nDialogBody>
					<N8nDialogDescription>
						Save your changes, or delete the workflow.
					</N8nDialogDescription>
					${contentPlaceholder}
				</N8nDialogBody>

				<N8nDialogFooter>
					<N8nButton variant="destructive" label="Delete" style="margin-inline-end: auto;" />
					<N8nDialogClose as-child>
						<N8nButton variant="outline" label="Cancel" />
					</N8nDialogClose>
					<N8nButton label="Save" />
				</N8nDialogFooter>
			</N8nDialog>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

/**
 * No footer. The body keeps its bottom padding.
 */
export const WithoutFooter: Story = {
	parameters: {
		docs: {
			description: {
				story: 'A dialog with no footer. The body keeps its bottom padding.',
			},
		},
	},
	render: () => ({
		components: {
			N8nDialog,
			N8nDialogBody,
			N8nDialogDescription,
			N8nButton,
		},
		setup() {
			const isOpen = ref(false);
			return { isOpen };
		},
		template: `
		<div>
			<N8nButton variant="solid" label="Open Dialog" @click="isOpen = true" />

			<N8nDialog v-model:open="isOpen" header="Workflow details" size="medium">
				<N8nDialogBody>
					<N8nDialogDescription>
						This dialog has no footer. The body keeps the space along its bottom edge.
					</N8nDialogDescription>
					${contentPlaceholder}
				</N8nDialogBody>
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
			N8nDialogDescription,
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
			<N8nButton variant="solid" label="Edit profile" @click="isOpen = true" />

			<N8nDialog
				v-model:open="isOpen"
				header="Edit profile"
			>
				<N8nDialogBody>
					<N8nDialogDescription>Update the details for this profile.</N8nDialogDescription>
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
			<N8nButton variant="solid" label="Open dialog" @click="isOpen = true" />

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

export const NoCloseOnEscape: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'Set closeOnEscape to false. Escape leaves the dialog open. An overlay click and the close button still close it.',
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
			<N8nButton variant="solid" label="Open dialog" @click="isOpen = true" />

			<N8nDialog v-model:open="isOpen" v-bind="args">
				<N8nDialogBody>
					<p>Press Escape. This dialog stays open.</p>
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
		closeOnEscape: false,
	},
} satisfies Story;

/**
 * A dialog opens an alert dialog on top of it.
 * Set stacked on the alert dialog so it renders above the first dialog.
 */
export const StackedDialogs: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'Open a dialog, then open an alert dialog on top of it. Set stacked on the alert dialog so it renders above the first dialog.',
			},
		},
	},
	render: () => ({
		components: {
			N8nDialog,
			N8nDialogBody,
			N8nDialogDescription,
			N8nDialogFooter,
			N8nDialogClose,
			N8nAlertDialog,
			N8nButton,
		},
		setup() {
			const isOpen = ref(false);
			const isAlertOpen = ref(false);
			const onDelete = () => {
				isAlertOpen.value = false;
				isOpen.value = false;
			};
			return { isOpen, isAlertOpen, onDelete };
		},
		template: `
		<div>
			<N8nButton variant="solid" label="Open dialog" @click="isOpen = true" />

			<N8nDialog v-model:open="isOpen" header="Project settings">
				<N8nDialogBody>
					<N8nDialogDescription>Update the project, or delete it.</N8nDialogDescription>
					${contentPlaceholder}
				</N8nDialogBody>

				<N8nDialogFooter>
					<N8nDialogClose as-child>
						<N8nButton variant="outline" label="Cancel" />
					</N8nDialogClose>
					<N8nButton variant="destructive" label="Delete project" @click="isAlertOpen = true" />
				</N8nDialogFooter>
			</N8nDialog>

			<N8nAlertDialog
				v-model:open="isAlertOpen"
				stacked
				title="Delete project?"
				description="This permanently deletes the project and its workflows. This can't be undone."
				action-label="Delete project"
				action-variant="destructive"
				@action="onDelete"
			/>
		</div>
		`,
	}),
	args: {},
} satisfies Story;
