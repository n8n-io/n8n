import type { ElTag } from 'element-plus';

export type NodeCreatorTag = {
	text: string;
	type?: (typeof ElTag)['type'];
	/** When true, renders as N8nBadge instead of ElTag. */
	pill?: boolean;
	/** When true, renders Preview through `N8nFeatureMaturityBadges`. `text` overrides the default label. */
	preview?: boolean;
};
