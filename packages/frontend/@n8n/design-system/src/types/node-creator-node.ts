/** Colors a node-creator badge can show. */
export const NODE_CREATOR_TAG_TYPE = ['success', 'info', 'warning', 'danger'] as const;

export type NodeCreatorTagType = (typeof NODE_CREATOR_TAG_TYPE)[number];

export type NodeCreatorTag = {
	text: string;
	/**
	 * Badge color.
	 * A pill keeps `info` and `danger`. Any other pill color uses the success badge.
	 * A tag that is not a pill uses this color. Omit it for the success badge.
	 */
	type?: NodeCreatorTagType;
	/** When true, only `info` and `danger` keep their color. Other colors use the success badge. */
	pill?: boolean;
	/** When true, renders as PreviewBadge. `text` overrides the default "Preview" label. */
	preview?: boolean;
};
