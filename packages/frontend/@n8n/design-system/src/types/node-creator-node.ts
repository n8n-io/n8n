import type { ElTag } from 'element-plus';

export type NodeCreatorTag = {
	text: string;
	type?: (typeof ElTag)['type'];
	/** When true, renders as N8nActionPill instead of ElTag. */
	pill?: boolean;
};
