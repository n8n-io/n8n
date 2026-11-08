import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed, ref } from 'vue';

import type { ActionDropdownItem } from '../../types';
import N8nActionDropdown from '../N8nActionDropdown/ActionDropdown.vue';
import N8nButton from '../N8nButton/Button.vue';
import type { IconName } from '../N8nIcon/icons';
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

export const Default: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'Arrow keys move the highlight. Enter, Space, or a click changes the value. The item sets the padding.',
			},
		},
	},
	render: () => ({
		components: { N8nListbox, N8nListboxItem },
		setup() {
			const value = ref('v2');
			return { value };
		},
		template: `
			<N8nListbox v-model="value" label="Versions" style="flex: none; width: 20rem">
				<N8nListboxItem value="v2">v2 · Latest</N8nListboxItem>
				<N8nListboxItem value="v1">v1 · Published</N8nListboxItem>
				<N8nListboxItem value="v0">v0 · Draft</N8nListboxItem>
			</N8nListbox>
		`,
	}),
};

export const ControlledUncontrolled: Story = {
	name: 'Controlled/Uncontrolled',
	render: () => ({
		components: { N8nListbox, N8nListboxItem, N8nButton },
		setup() {
			const value = ref<string | undefined>('v2');
			const presets: Array<{ label: string; value: string | undefined }> = [
				{ label: 'v2', value: 'v2' },
				{ label: 'v1', value: 'v1' },
				{ label: 'Clear', value: undefined },
			];
			return { value, presets };
		},
		template: `
			<div style="display: flex; flex-direction: column; gap: var(--spacing--xl)">
				<section style="display: flex; flex-direction: column; gap: var(--spacing--sm); width: 20rem">
					<h3 style="margin: 0; font-size: var(--font-size--sm); font-weight: var(--font-weight--bold)">
						Controlled
					</h3>
					<N8nListbox v-model="value" label="Versions (controlled)" style="flex: none">
						<N8nListboxItem value="v2">v2 · Latest</N8nListboxItem>
						<N8nListboxItem value="v1">v1 · Published</N8nListboxItem>
						<N8nListboxItem value="v0">v0 · Draft</N8nListboxItem>
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
					<N8nListbox default-value="v1" label="Versions (uncontrolled)" style="flex: none">
						<N8nListboxItem value="v2">v2 · Latest</N8nListboxItem>
						<N8nListboxItem value="v1">v1 · Published</N8nListboxItem>
						<N8nListboxItem value="v0">v0 · Draft</N8nListboxItem>
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
			return { value };
		},
		template: `
			<N8nListbox
				v-model="value"
				orientation="horizontal"
				label="Density"
				style="flex: none"
			>
				<N8nListboxItem value="compact">Compact</N8nListboxItem>
				<N8nListboxItem value="comfortable">Comfortable</N8nListboxItem>
				<N8nListboxItem value="spacious">Spacious</N8nListboxItem>
			</N8nListbox>
		`,
	}),
};

export const DisabledItem: Story = {
	name: 'Disabled Item',
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
			return { value };
		},
		template: `
			<N8nListbox v-model="value" label="Versions" style="flex: none; width: 20rem">
				<N8nListboxItem value="v4">v4 · Latest</N8nListboxItem>
				<N8nListboxItem value="v3">v3 · Published</N8nListboxItem>
				<N8nListboxItem value="v2" disabled>v2 · Draft</N8nListboxItem>
				<N8nListboxItem value="v1" disabled>v1 · Review</N8nListboxItem>
				<N8nListboxItem value="v0">v0 · Archived</N8nListboxItem>
			</N8nListbox>
		`,
	}),
};

export const SelectionBehavior: Story = {
	name: 'Selection Behavior',
	render: () => ({
		components: { N8nListbox, N8nListboxItem },
		setup() {
			const replaceValue = ref<string | undefined>('v2');
			const toggleValue = ref<string | undefined>('v2');
			return { replaceValue, toggleValue };
		},
		template: `
			<div style="display: flex; flex-direction: column; gap: var(--spacing--xl)">
				<section style="display: flex; flex-direction: column; gap: var(--spacing--sm); width: 20rem">
					<h3 style="margin: 0; font-size: var(--font-size--sm); font-weight: var(--font-weight--bold)">
						Replace
					</h3>
					<N8nListbox
						v-model="replaceValue"
						selection-behavior="replace"
						label="Versions (replace)"
						style="flex: none"
					>
						<N8nListboxItem value="v2">v2 · Latest</N8nListboxItem>
						<N8nListboxItem value="v1">v1 · Published</N8nListboxItem>
					</N8nListbox>
				</section>
				<section style="display: flex; flex-direction: column; gap: var(--spacing--sm); width: 20rem">
					<h3 style="margin: 0; font-size: var(--font-size--sm); font-weight: var(--font-weight--bold)">
						Toggle
					</h3>
					<N8nListbox
						v-model="toggleValue"
						selection-behavior="toggle"
						label="Versions (toggle)"
						style="flex: none"
					>
						<N8nListboxItem value="v2">v2 · Latest</N8nListboxItem>
						<N8nListboxItem value="v1">v1 · Published</N8nListboxItem>
					</N8nListbox>
				</section>
			</div>
		`,
	}),
};

const customItemStyle = `
.listbox-custom-card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	padding: var(--spacing--xs);
	border: var(--border-width) solid var(--border-color);
	border-radius: var(--radius);
	background-color: var(--background--surface);
}
.listbox-custom-list [data-highlighted] .listbox-custom-card {
	border-color: var(--color--primary);
}
.listbox-custom-list [data-state='checked'] .listbox-custom-card {
	border-color: var(--color--primary);
	background-color: var(--color--primary--tint-3);
}
`;

export const CustomItem: Story = {
	name: 'Custom Item',
	parameters: {
		docs: {
			description: {
				story:
					'Set the item background tokens to transparent and the item padding to 0. The card paints the highlight, the selected fill, and its own padding. The item keeps selection and keyboard behavior.',
			},
		},
	},
	render: () => ({
		components: { N8nListbox, N8nListboxItem, N8nText },
		setup() {
			const value = ref('v2');
			return { value, customItemStyle };
		},
		template: `
			<div class="listbox-custom-list" style="width: 20rem">
				<component :is="'style'">{{ customItemStyle }}</component>
				<N8nListbox
					v-model="value"
					label="Versions"
					style="flex: none; --n8n-listbox-item--color--background--highlight: transparent; --n8n-listbox-item--color--background--selected: transparent; --n8n-listbox-item--radius: 0; --n8n-listbox-item--padding: 0"
				>
					<N8nListboxItem value="v2">
						<span class="listbox-custom-card">
							<span>
								<N8nText bold size="small" color="text-dark">v2</N8nText>
								<N8nText size="small" color="text-light"> · Latest</N8nText>
							</span>
							<N8nText size="small" color="text-base">Ada Lovelace, Oct 24 at 14:28</N8nText>
						</span>
					</N8nListboxItem>
					<N8nListboxItem value="v1">
						<span class="listbox-custom-card">
							<span>
								<N8nText bold size="small" color="text-dark">v1</N8nText>
								<N8nText size="small" color="text-light"> · Published</N8nText>
							</span>
							<N8nText size="small" color="text-base">Grace Hopper, Oct 22 at 09:14</N8nText>
						</span>
					</N8nListboxItem>
					<N8nListboxItem value="v0">
						<span class="listbox-custom-card">
							<span>
								<N8nText bold size="small" color="text-dark">v0</N8nText>
								<N8nText size="small" color="text-light"> · Draft</N8nText>
							</span>
							<N8nText size="small" color="text-base">Alan Turing, Oct 18 at 16:02</N8nText>
						</span>
					</N8nListboxItem>
				</N8nListbox>
			</div>
		`,
	}),
};

const actionsMenuStyle = `
.listbox-actions-copy {
	display: flex;
	flex-direction: column;
	min-width: 0;
	gap: var(--spacing--5xs);
}
`;

const workflowActions: Array<ActionDropdownItem<string>> = [
	{ id: 'duplicate', label: 'Duplicate', icon: 'copy' },
	{ id: 'rename', label: 'Rename', icon: 'pencil' },
	{ id: 'delete', label: 'Delete', icon: 'trash-2', divided: true, variant: 'destructive' },
];

export const ActionsMenu: Story = {
	name: 'Actions Menu',
	render: () => ({
		components: { N8nListbox, N8nListboxItem, N8nActionDropdown, N8nText },
		setup() {
			const workflows: Array<{ id: string; name: string; detail: string; icon: IconName }> = [
				{ id: 'sync', name: 'Sync contacts', detail: 'Runs every hour', icon: 'refresh-cw' },
				{ id: 'digest', name: 'Weekly digest', detail: 'Sends on Monday', icon: 'copy' },
				{ id: 'archive', name: 'Archive old leads', detail: 'Paused', icon: 'archive' },
			];
			const value = ref('sync');
			const lastAction = ref('');
			const selected = computed(
				() => workflows.find((workflow) => workflow.id === value.value)?.name ?? '(none)',
			);

			function onAction(workflowName: string, actionId: string) {
				const label = workflowActions.find((action) => action.id === actionId)?.label ?? actionId;
				lastAction.value = `${label} · ${workflowName}`;
			}

			return {
				workflows,
				workflowActions,
				value,
				lastAction,
				selected,
				onAction,
				actionsMenuStyle,
			};
		},
		template: `
			<div style="display: flex; flex-direction: column; gap: var(--spacing--sm); width: 24rem">
				<component :is="'style'">{{ actionsMenuStyle }}</component>
				<N8nListbox v-model="value" label="Workflows" style="flex: none">
					<N8nListboxItem
						v-for="workflow in workflows"
						:key="workflow.id"
						:value="workflow.id"
						:icon="workflow.icon"
					>
						<span class="listbox-actions-copy">
							<N8nText bold size="small" color="text-dark">{{ workflow.name }}</N8nText>
							<N8nText size="small" color="text-light">{{ workflow.detail }}</N8nText>
						</span>
						<template #trailing>
							<N8nActionDropdown
								:items="workflowActions"
								activator-size="small"
								placement="bottom-end"
								@click.stop
								@keydown.enter.stop
								@keydown.space.stop
								@select="onAction(workflow.name, $event)"
							/>
						</template>
					</N8nListboxItem>
				</N8nListbox>
				<p style="margin: 0; font-size: var(--font-size--sm)">
					Selected: <strong>{{ selected }}</strong>
				</p>
				<p style="margin: 0; font-size: var(--font-size--sm)">
					Last action: <strong>{{ lastAction || '(none)' }}</strong>
				</p>
			</div>
		`,
	}),
};
