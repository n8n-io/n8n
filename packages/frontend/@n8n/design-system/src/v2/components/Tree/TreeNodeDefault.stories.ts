import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';

import treeVariables from './Tree.variables.module.css';
import TreeNodeDefault from './TreeNodeDefault.vue';
import Checkbox from '../Checkbox/Checkbox.vue';

const noop = () => undefined;

const longLabel = 'Quarterly automation rollout for customer onboarding and billing reconciliation';

type VariantProps = {
	label: string;
	icon?: IconName;
	disabled?: boolean;
	showExpandArrow?: boolean;
	isExpanded: boolean;
	isSelected: boolean;
	hasChildren: boolean;
};

const variants: Array<{ name: string; props: VariantProps }> = [
	{
		name: 'Default',
		props: {
			label: 'Workflows',
			icon: 'bolt-filled',
			isExpanded: false,
			isSelected: false,
			hasChildren: false,
		},
	},
	{
		name: 'Selected',
		props: {
			label: 'All workflows',
			icon: 'list-tree',
			isExpanded: false,
			isSelected: true,
			hasChildren: false,
		},
	},
	{
		name: 'Disabled',
		props: {
			label: 'Credentials',
			icon: 'lock',
			isExpanded: false,
			isSelected: true,
			hasChildren: false,
			disabled: true,
		},
	},
	{
		name: 'Branch (collapsed)',
		props: {
			label: 'Executions',
			icon: 'list',
			isExpanded: false,
			isSelected: false,
			hasChildren: true,
		},
	},
	{
		name: 'Branch (expanded)',
		props: {
			label: 'Executions',
			icon: 'list',
			isExpanded: true,
			isSelected: false,
			hasChildren: true,
		},
	},
	{
		name: 'Without expand arrow',
		props: {
			label: 'Settings',
			icon: 'settings',
			isExpanded: false,
			isSelected: false,
			hasChildren: true,
			showExpandArrow: false,
		},
	},
	{
		name: 'Long label',
		props: {
			label: longLabel,
			icon: 'list-tree',
			isExpanded: false,
			isSelected: false,
			hasChildren: true,
		},
	},
	{
		name: 'Without icon',
		props: {
			label: 'Variables',
			isExpanded: false,
			isSelected: false,
			hasChildren: false,
		},
	},
];

const meta = {
	title: 'Experimental/Tree/TreeNodeDefault',
	component: TreeNodeDefault,
	tags: ['autodocs'],
	parameters: {
		docs: {
			source: { type: 'dynamic' },
		},
	},
} satisfies Meta<typeof TreeNodeDefault>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		label: 'Workflows',
		icon: 'bolt-filled',
		isExpanded: false,
		isSelected: false,
		hasChildren: false,
		handleToggle: noop,
		handleSelect: noop,
	},
	render: (args) => ({
		components: { TreeNodeDefault },
		setup() {
			return { args, treeVariables, noop };
		},
		template: `
			<ul
				role="tree"
				:class="treeVariables.root"
				style="width: 320px; list-style: none; padding: 0; margin: 0;"
			>
				<TreeNodeDefault
					v-bind="args"
					tabindex="0"
					:handle-toggle="noop"
					:handle-select="noop"
				/>
			</ul>
		`,
	}),
};

export const Variants: Story = {
	render: () => ({
		components: { TreeNodeDefault, Checkbox },
		setup() {
			const checkboxSelected = ref(false);
			const checkboxDisabledSelected = ref(true);

			function toggleCheckboxSelected() {
				checkboxSelected.value = !checkboxSelected.value;
			}

			return {
				variants,
				treeVariables,
				noop,
				checkboxSelected,
				checkboxDisabledSelected,
				toggleCheckboxSelected,
			};
		},
		template: `
			<div style="display: flex; flex-direction: column; gap: var(--spacing--sm);">
				<div
					v-for="variant in variants"
					:key="variant.name"
					style="display: flex; flex-direction: column; gap: var(--spacing--4xs);"
				>
					<span style="font-size: var(--font-size--2xs); color: var(--color--text--tint-1);">
						{{ variant.name }}
					</span>
					<ul
						role="tree"
						:class="treeVariables.root"
						style="width: 320px; list-style: none; padding: 0; margin: 0;"
					>
						<TreeNodeDefault
							v-bind="variant.props"
							tabindex="0"
							:handle-toggle="noop"
							:handle-select="noop"
						/>
					</ul>
				</div>

				<div style="display: flex; flex-direction: column; gap: var(--spacing--4xs);">
					<span style="font-size: var(--font-size--2xs); color: var(--color--text--tint-1);">
						Checkbox icon (interactive)
					</span>
					<ul
						role="tree"
						:class="treeVariables.root"
						style="width: 320px; list-style: none; padding: 0; margin: 0;"
					>
						<TreeNodeDefault
							label="Workflows"
							tabindex="0"
							:is-expanded="false"
							:is-selected="checkboxSelected"
							:has-children="true"
							:handle-toggle="noop"
							:handle-select="toggleCheckboxSelected"
						>
							<template #icon="{ disabled, ui }">
								<span v-bind="ui">
									<Checkbox
										:model-value="checkboxSelected"
										:disabled="disabled"
										@click.stop
										@update:model-value="toggleCheckboxSelected"
									/>
								</span>
							</template>
						</TreeNodeDefault>
					</ul>
				</div>

				<div style="display: flex; flex-direction: column; gap: var(--spacing--4xs);">
					<span style="font-size: var(--font-size--2xs); color: var(--color--text--tint-1);">
						Checkbox icon (disabled)
					</span>
					<ul
						role="tree"
						:class="treeVariables.root"
						style="width: 320px; list-style: none; padding: 0; margin: 0;"
					>
						<TreeNodeDefault
							label="Credentials"
							tabindex="0"
							disabled
							:is-expanded="false"
							:is-selected="checkboxDisabledSelected"
							:has-children="false"
							:handle-toggle="noop"
							:handle-select="noop"
						>
							<template #icon="{ disabled, ui }">
								<span v-bind="ui">
									<Checkbox :model-value="checkboxDisabledSelected" :disabled="disabled" />
								</span>
							</template>
						</TreeNodeDefault>
					</ul>
				</div>
			</div>
		`,
	}),
	args: {
		label: 'Workflows',
		icon: 'bolt-filled',
		isExpanded: false,
		isSelected: false,
		hasChildren: false,
		handleToggle: noop,
		handleSelect: noop,
	},
};
