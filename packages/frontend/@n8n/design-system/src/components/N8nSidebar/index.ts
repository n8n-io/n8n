export type TreeItemType = FolderItem | WorkflowItem;

export interface BaseItem {
	id: string;
	label: string;
	disabled?: boolean;
	data?: any;
}

export interface FolderItem extends BaseItem {
	type: 'folder';
	children?: TreeItemType[];
}

export interface WorkflowItem extends BaseItem {
	type: 'workflow';
}
