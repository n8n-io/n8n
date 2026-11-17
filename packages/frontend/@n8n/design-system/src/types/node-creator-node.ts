import type { ElTag } from 'element-plus';

export type NodeCreatorTag = {
	/** Label for a pill or tag. A feature badge does not use this. */
	text?: string;
	type?: (typeof ElTag)['type'];
	/** When true, renders as N8nBadge instead of ElTag. */
	pill?: boolean;
	/**
	 * Feature id from the list the app provides.
	 * The entry decides which badges render beside the title.
	 */
	feature?: string;
};
