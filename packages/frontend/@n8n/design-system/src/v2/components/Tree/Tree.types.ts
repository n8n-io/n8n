import type { FlattenedItem, TreeRootEmits, TreeRootProps } from 'reka-ui';
import type { Component } from 'vue';

import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';

export type TreeItem = {
	id: string;
	label: string;
	icon?: IconName;
};

export interface TreeBranch extends TreeItem {
	children?: TreeBranch[];
}

export type TreeNodeContext<T extends TreeItem = TreeBranch> = {
	item: FlattenedItem<T>;
	handleToggle: () => void;
	handleSelect: () => void;
	isExpanded: boolean;
	hasChildren: boolean;
};

export type TreeDefaultNodeProps = {
	label: string;
};

export type TreeGetNodeProps<
	T extends TreeItem = TreeBranch,
	P extends Record<string, unknown> = TreeDefaultNodeProps,
> = (context: TreeNodeContext<T>) => P;

export type TreeProps = Omit<
	TreeRootProps<TreeBranch, TreeBranch, boolean>,
	'asChild' | 'as' | 'getKey' | 'getChildren' | 'modelValue' | 'defaultValue'
> & {
	items: TreeBranch[];
	getKey?: (item: TreeBranch) => string;
	getChildren?: (item: TreeBranch) => TreeBranch[] | undefined;
	modelValue?: string[];
	defaultValue?: string[];
	showExpandArrow?: boolean;
	virtualized?: boolean;
	estimateSize?: number;
	overscan?: number;
	textContent?: (item: TreeBranch) => string;
	node?: Component;
	getNodeProps?: TreeGetNodeProps;
};

export type TreeEmits = Omit<TreeRootEmits<TreeBranch, boolean>, 'update:modelValue'> & {
	'update:modelValue': [value: string[]];
};

export type TreeDefaultSlotProps = TreeNodeContext;

type TreeNodeDefaultIconSlotProps = {
	icon?: IconName;
	disabled?: boolean;
	isSelected: boolean;
	ui: { class: string };
};

type TreeNodeDefaultLabelSlotProps = {
	label: string;
	disabled?: boolean;
	handleSelect: () => void;
	ui: { class: string };
};

type TreeNodeDefaultToggleSlotProps = {
	label: string;
	disabled?: boolean;
	isExpanded: boolean;
	handleToggle: () => void;
	ui: {
		class: string;
		iconClass: string;
		iconExpandedClass: string;
	};
};

export type TreeNodeDefaultSlots = {
	icon?: (props: TreeNodeDefaultIconSlotProps) => unknown;
	label?: (props: TreeNodeDefaultLabelSlotProps) => unknown;
	toggle?: (props: TreeNodeDefaultToggleSlotProps) => unknown;
};

export type TreeSlots = {
	default?: (props: TreeDefaultSlotProps) => unknown;
	icon?: (props: TreeNodeDefaultIconSlotProps) => unknown;
	label?: (props: TreeNodeDefaultLabelSlotProps) => unknown;
	toggle?: (props: TreeNodeDefaultToggleSlotProps) => unknown;
};
