<script setup lang="ts">
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';

import TreeNodeDefault from './TreeNodeDefault.vue';
import treeVariables from './Tree.variables.module.css';

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

const variants: { name: string; props: VariantProps }[] = [
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
</script>

<template>
	<div :class="$style.showcase">
		<div v-for="variant in variants" :key="variant.name" :class="$style.variant">
			<span :class="$style.variantLabel">{{ variant.name }}</span>
			<div role="treeitem" tabindex="0" :class="[treeVariables.root, $style.treeItemShell]">
				<TreeNodeDefault v-bind="variant.props" :handle-toggle="noop" :handle-select="noop" />
			</div>
		</div>
	</div>
</template>

<style lang="css" module>
.showcase {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.variant {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.variantLabel {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.treeItemShell {
	width: 320px;
}
</style>
