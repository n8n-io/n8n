import type { ElTag } from 'element-plus';

export type NodeCreatorTag = {
	text: string;
	type?: (typeof ElTag)['type'];
	/** When true, renders as N8nBadge instead of ElTag. */
	pill?: boolean;
	/** When true, renders as PreviewBadge instead of ElTag; `text` overrides the tag's default "Preview" label. */
	preview?: boolean;
};
