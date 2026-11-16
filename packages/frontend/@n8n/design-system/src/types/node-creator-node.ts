import type { ElTag } from 'element-plus';

export type NodeCreatorTag = {
	text: string;
	type?: (typeof ElTag)['type'];
	/** When true, renders as N8nBadge instead of ElTag. */
	pill?: boolean;
	/** When true, renders the Preview badge through `N8nFeatureMaturityBadges`. */
	preview?: boolean;
};
