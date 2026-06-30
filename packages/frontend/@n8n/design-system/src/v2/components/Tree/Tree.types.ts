import type { Component } from 'vue';
import type { FlattenedItem, TreeRootEmits, TreeRootProps } from 'reka-ui';

import { IconName } from '@n8n/design-system/components';

export interface TreeItem<T = unknown> {
	id: string;
	label: string;
	children?: TreeItem<T>[];
	icon?: IconName;
}

export type TreeNodeContext<T extends TreeItem> = {
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
	T extends TreeItem,
	P extends Record<string, unknown> = TreeDefaultNodeProps,
> = (context: TreeNodeContext<T>) => P;

export type TreeProps<T extends TreeItem> = Omit<TreeRootProps<T>, 'asChild' | 'as'> & {
	items: T[];
	showExpandArrow?: boolean;
	node?: Component;
	getNodeProps?: TreeGetNodeProps<T>;
};

export type TreeEmits = TreeRootEmits;

export type TreeDefaultSlotProps<T extends TreeItem> = TreeNodeContext<T>;

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

export type TreeSlots<T extends TreeItem> = {
	default?: (props: TreeDefaultSlotProps<T>) => unknown;
	icon?: (props: TreeNodeDefaultIconSlotProps) => unknown;
	label?: (props: TreeNodeDefaultLabelSlotProps) => unknown;
	toggle?: (props: TreeNodeDefaultToggleSlotProps) => unknown;
};
