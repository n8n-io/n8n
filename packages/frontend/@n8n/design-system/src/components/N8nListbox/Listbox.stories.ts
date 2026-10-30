import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import N8nBadge from '../N8nBadge/Badge.vue';
import N8nButton from '../N8nButton/Button.vue';
import N8nIcon from '../N8nIcon/Icon.vue';
import N8nText from '../N8nText/Text.vue';
import N8nListbox from './Listbox.vue';
import N8nListboxItem from './ListboxItem.vue';

const meta = {
	title: 'Core/Listbox',
	component: N8nListbox,
	parameters: {
		docs: {
			source: { type: 'dynamic' },
		},
	},
} satisfies Meta<typeof N8nListbox>;

export default meta;

type Story = StoryObj<typeof meta>;

const row =
	'display: flex; align-items: center; box-sizing: border-box; min-height: var(--height--lg); padding-inline: var(--spacing--xs); font-size: var(--font-size--sm); line-height: var(--line-height--sm)';

export const Default: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'Arrow keys move the highlight. Enter, Space, or a click changes the value. The item has no padding. This story sets padding on the row.',
			},
		},
	},
	render: () => ({
		components: { N8nListbox, N8nListboxItem },
		setup() {
			const value = ref('v2');
			return { value, row };
		},
		template: `
			<N8nListbox v-model="value" label="Versions" style="flex: none; width: 20rem">
				<N8nListboxItem value="v2">
					<span :style="row">v2 · Latest</span>
				</N8nListboxItem>
				<N8nListboxItem value="v1">
					<span :style="row">v1 · Published</span>
				</N8nListboxItem>
				<N8nListboxItem value="v0">
					<span :style="row">v0 · Draft</span>
				</N8nListboxItem>
			</N8nListbox>
		`,
	}),
};

export const ControlledUncontrolled: Story = {
	name: 'Controlled/Uncontrolled',
	parameters: {
		docs: {
			description: {
				story:
					'Bind `v-model` when the parent owns the value. Omit it and set `defaultValue` when the list keeps the value.',
			},
		},
	},
	render: () => ({
		components: { N8nListbox, N8nListboxItem, N8nButton },
		setup() {
			const value = ref<string | undefined>('v2');
			const presets: Array<{ label: string; value: string | undefined }> = [
				{ label: 'v2', value: 'v2' },
				{ label: 'v1', value: 'v1' },
				{ label: 'Clear', value: undefined },
			];
			return { value, presets, row };
		},
		template: `
			<div style="display: flex; flex-direction: column; gap: var(--spacing--xl)">
				<section style="display: flex; flex-direction: column; gap: var(--spacing--sm); width: 20rem">
					<h3 style="margin: 0; font-size: var(--font-size--sm); font-weight: var(--font-weight--bold)">
						Controlled
					</h3>
					<p style="margin: 0; font-size: var(--font-size--sm); color: var(--text-color--subtler)">
						The parent owns the value through <code>v-model</code>. The buttons set it from outside the list.
						The list keeps the previous value until the parent accepts <code>update:modelValue</code>.
					</p>
					<p style="margin: 0; font-size: var(--font-size--sm)">
						Selected: <strong>{{ value || '(none)' }}</strong>
					</p>
					<N8nListbox v-model="value" label="Versions (controlled)" style="flex: none">
						<N8nListboxItem value="v2">
							<span :style="row">v2 · Latest</span>
						</N8nListboxItem>
						<N8nListboxItem value="v1">
							<span :style="row">v1 · Published</span>
						</N8nListboxItem>
						<N8nListboxItem value="v0">
							<span :style="row">v0 · Draft</span>
						</N8nListboxItem>
					</N8nListbox>
					<div style="display: flex; gap: var(--spacing--2xs); flex-wrap: wrap">
						<N8nButton
							v-for="preset in presets"
							:key="preset.label"
							size="small"
							variant="outline"
							@click="value = preset.value"
						>
							{{ preset.label }}
						</N8nButton>
					</div>
				</section>
				<section style="display: flex; flex-direction: column; gap: var(--spacing--sm); width: 20rem">
					<h3 style="margin: 0; font-size: var(--font-size--sm); font-weight: var(--font-weight--bold)">
						Uncontrolled
					</h3>
					<p style="margin: 0; font-size: var(--font-size--sm); color: var(--text-color--subtler)">
						<code>defaultValue</code> sets the first value. The parent does not bind <code>v-model</code>.
						The list keeps later changes.
					</p>
					<N8nListbox default-value="v1" label="Versions (uncontrolled)" style="flex: none">
						<N8nListboxItem value="v2">
							<span :style="row">v2 · Latest</span>
						</N8nListboxItem>
						<N8nListboxItem value="v1">
							<span :style="row">v1 · Published</span>
						</N8nListboxItem>
						<N8nListboxItem value="v0">
							<span :style="row">v0 · Draft</span>
						</N8nListboxItem>
					</N8nListbox>
				</section>
			</div>
		`,
	}),
};

export const Horizontal: Story = {
	parameters: {
		docs: {
			description: {
				story: 'Left and Right move the highlight. Items sit in a row.',
			},
		},
	},
	render: () => ({
		components: { N8nListbox, N8nListboxItem },
		setup() {
			const value = ref('comfortable');
			return { value, row };
		},
		template: `
			<div style="display: flex; flex-direction: column; gap: var(--spacing--xs)">
				<p style="margin: 0; font-size: var(--font-size--sm); color: var(--text-color--subtler)">
					Left and Right move the highlight. Up and Down do not.
				</p>
				<N8nListbox
					v-model="value"
					orientation="horizontal"
					label="Density"
					style="flex: none"
				>
					<N8nListboxItem value="compact">
						<span :style="row">Compact</span>
					</N8nListboxItem>
					<N8nListboxItem value="comfortable">
						<span :style="row">Comfortable</span>
					</N8nListboxItem>
					<N8nListboxItem value="spacious">
						<span :style="row">Spacious</span>
					</N8nListboxItem>
				</N8nListbox>
				<p style="margin: 0; font-size: var(--font-size--sm)">Selected: {{ value }}</p>
			</div>
		`,
	}),
};

export const DisabledItem: Story = {
	name: 'Disabled item',
	parameters: {
		docs: {
			description: {
				story:
					'Disabled items can sit between other items. Arrow keys skip them. A click does not change the value.',
			},
		},
	},
	render: () => ({
		components: { N8nListbox, N8nListboxItem },
		setup() {
			const value = ref('v4');
			return { value, row };
		},
		template: `
			<div style="display: flex; flex-direction: column; gap: var(--spacing--xs); width: 20rem">
				<p style="margin: 0; font-size: var(--font-size--sm); color: var(--text-color--subtler)">
					Draft and Review sit between the other versions. Arrow keys skip them. A click does not select them.
				</p>
				<N8nListbox v-model="value" label="Versions" style="flex: none">
					<N8nListboxItem value="v4">
						<span :style="row">v4 · Latest</span>
					</N8nListboxItem>
					<N8nListboxItem value="v3">
						<span :style="row">v3 · Published</span>
					</N8nListboxItem>
					<N8nListboxItem value="v2" disabled>
						<span :style="row">v2 · Draft</span>
					</N8nListboxItem>
					<N8nListboxItem value="v1" disabled>
						<span :style="row">v1 · Review</span>
					</N8nListboxItem>
					<N8nListboxItem value="v0">
						<span :style="row">v0 · Archived</span>
					</N8nListboxItem>
				</N8nListbox>
				<p style="margin: 0; font-size: var(--font-size--sm)">Selected: {{ value }}</p>
			</div>
		`,
	}),
};

export const HighlightOnHover: Story = {
	name: 'Highlight on hover',
	parameters: {
		docs: {
			description: {
				story: 'Pointer movement moves the highlight. The highlight fill follows the pointer.',
			},
		},
	},
	render: () => ({
		components: { N8nListbox, N8nListboxItem },
		setup() {
			const value = ref('v2');
			return { value, row };
		},
		template: `
			<div style="display: flex; flex-direction: column; gap: var(--spacing--xs); width: 20rem">
				<p style="margin: 0; font-size: var(--font-size--sm); color: var(--text-color--subtler)">
					Move the pointer over an item. The highlight follows the pointer.
				</p>
				<N8nListbox v-model="value" highlight-on-hover label="Versions" style="flex: none">
					<N8nListboxItem value="v2">
						<span :style="row">v2 · Latest</span>
					</N8nListboxItem>
					<N8nListboxItem value="v1">
						<span :style="row">v1 · Published</span>
					</N8nListboxItem>
					<N8nListboxItem value="v0">
						<span :style="row">v0 · Draft</span>
					</N8nListboxItem>
				</N8nListbox>
				<p style="margin: 0; font-size: var(--font-size--sm)">Selected: {{ value }}</p>
			</div>
		`,
	}),
};

export const SelectionBehavior: Story = {
	name: 'Selection behavior',
	parameters: {
		docs: {
			description: {
				story:
					'`replace` keeps the value when the user activates the selected item again. `toggle` clears it.',
			},
		},
	},
	render: () => ({
		components: { N8nListbox, N8nListboxItem },
		setup() {
			const replaceValue = ref<string | undefined>('v2');
			const toggleValue = ref<string | undefined>('v2');
			return { replaceValue, toggleValue, row };
		},
		template: `
			<div style="display: flex; flex-direction: column; gap: var(--spacing--xl)">
				<section style="display: flex; flex-direction: column; gap: var(--spacing--sm); width: 20rem">
					<h3 style="margin: 0; font-size: var(--font-size--sm); font-weight: var(--font-weight--bold)">
						Replace
					</h3>
					<p style="margin: 0; font-size: var(--font-size--sm); color: var(--text-color--subtler)">
						Activate the selected item again. The value stays.
					</p>
					<N8nListbox
						v-model="replaceValue"
						selection-behavior="replace"
						label="Versions (replace)"
						style="flex: none"
					>
						<N8nListboxItem value="v2">
							<span :style="row">v2 · Latest</span>
						</N8nListboxItem>
						<N8nListboxItem value="v1">
							<span :style="row">v1 · Published</span>
						</N8nListboxItem>
					</N8nListbox>
					<p style="margin: 0; font-size: var(--font-size--sm)">
						Selected: <strong>{{ replaceValue || '(none)' }}</strong>
					</p>
				</section>
				<section style="display: flex; flex-direction: column; gap: var(--spacing--sm); width: 20rem">
					<h3 style="margin: 0; font-size: var(--font-size--sm); font-weight: var(--font-weight--bold)">
						Toggle
					</h3>
					<p style="margin: 0; font-size: var(--font-size--sm); color: var(--text-color--subtler)">
						Activate the selected item again. The value clears.
					</p>
					<N8nListbox
						v-model="toggleValue"
						selection-behavior="toggle"
						label="Versions (toggle)"
						style="flex: none"
					>
						<N8nListboxItem value="v2">
							<span :style="row">v2 · Latest</span>
						</N8nListboxItem>
						<N8nListboxItem value="v1">
							<span :style="row">v1 · Published</span>
						</N8nListboxItem>
					</N8nListbox>
					<p style="margin: 0; font-size: var(--font-size--sm)">
						Selected: <strong>{{ toggleValue || '(none)' }}</strong>
					</p>
				</section>
			</div>
		`,
	}),
};

const customContentStyle = `
.listbox-custom-version,
.listbox-custom-workflow {
	display: flex;
	min-width: 0;
	padding: var(--spacing--3xs) var(--spacing--xs);
}
.listbox-custom-version {
	flex-direction: column;
	gap: var(--spacing--5xs);
}
.listbox-custom-workflow {
	align-items: center;
	gap: var(--spacing--xs);
}
.listbox-custom-copy {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
	gap: var(--spacing--5xs);
}
`;

export const CustomContent: Story = {
	name: 'Custom content',
	parameters: {
		docs: {
			description: {
				story:
					'The item slot holds the row. The item has no padding. Set padding on the slot content. Set `--listbox-item--color--background--highlight` to replace the highlight.',
			},
		},
	},
	render: () => ({
		components: { N8nListbox, N8nListboxItem, N8nBadge, N8nIcon, N8nText },
		setup() {
			const version = ref('v2');
			const workflow = ref('sync');
			return { version, workflow, customContentStyle };
		},
		template: `
			<div style="display: flex; flex-direction: column; gap: var(--spacing--xl)">
				<component :is="'style'">{{ customContentStyle }}</component>
				<section style="display: flex; flex-direction: column; gap: var(--spacing--sm); width: 20rem">
					<h3 style="margin: 0; font-size: var(--font-size--sm); font-weight: var(--font-weight--bold)">
						Version row
					</h3>
					<p style="margin: 0; font-size: var(--font-size--sm); color: var(--text-color--subtler)">
						The row sets its own padding. The item only paints the highlight.
					</p>
					<N8nListbox v-model="version" label="Versions" style="flex: none">
						<N8nListboxItem value="v2">
							<span class="listbox-custom-version">
								<span>
									<N8nText bold size="small" color="text-dark">v2</N8nText>
									<N8nText size="small" color="text-light"> · Latest</N8nText>
								</span>
								<N8nText size="small" color="text-base">Ada Lovelace, Oct 24 at 14:28</N8nText>
							</span>
						</N8nListboxItem>
						<N8nListboxItem value="v1">
							<span class="listbox-custom-version">
								<span>
									<N8nText bold size="small" color="text-dark">v1</N8nText>
									<N8nText size="small" color="text-light"> · Published</N8nText>
								</span>
								<N8nText size="small" color="text-base">Grace Hopper, Oct 22 at 09:14</N8nText>
							</span>
						</N8nListboxItem>
						<N8nListboxItem value="v0" disabled>
							<span class="listbox-custom-version">
								<span>
									<N8nText bold size="small">v0</N8nText>
									<N8nText size="small"> · Draft</N8nText>
								</span>
								<N8nText size="small">Alan Turing, Oct 18 at 16:02</N8nText>
							</span>
						</N8nListboxItem>
					</N8nListbox>
				</section>
				<section style="display: flex; flex-direction: column; gap: var(--spacing--sm); width: 24rem">
					<h3 style="margin: 0; font-size: var(--font-size--sm); font-weight: var(--font-weight--bold)">
						Workflow row
					</h3>
					<p style="margin: 0; font-size: var(--font-size--sm); color: var(--text-color--subtler)">
						This list sets <code>--listbox-item--color--background--highlight</code>.
					</p>
					<N8nListbox
						v-model="workflow"
						label="Workflows"
						style="flex: none; --listbox-item--color--background--highlight: var(--color--primary--tint-3)"
					>
						<N8nListboxItem value="sync">
							<span class="listbox-custom-workflow">
								<N8nIcon icon="workflow" size="large" color="text-base" />
								<span class="listbox-custom-copy">
									<N8nText bold size="small" color="text-dark">Sync contacts</N8nText>
									<N8nText size="small" color="text-light">Runs every hour</N8nText>
								</span>
								<N8nBadge variant="success">Active</N8nBadge>
							</span>
						</N8nListboxItem>
						<N8nListboxItem value="digest">
							<span class="listbox-custom-workflow">
								<N8nIcon icon="git-branch" size="large" color="text-base" />
								<span class="listbox-custom-copy">
									<N8nText bold size="small" color="text-dark">Weekly digest</N8nText>
									<N8nText size="small" color="text-light">Sends on Monday</N8nText>
								</span>
								<N8nBadge variant="subtle">Paused</N8nBadge>
							</span>
						</N8nListboxItem>
					</N8nListbox>
				</section>
			</div>
		`,
	}),
};
