export type ActionUrlInput = {
	baseUrl: string;
	app: { namespace: string };
	/** The page whose `content` or `layout` holds the block. */
	actionPageId: string;
	blockId: string;
	/** The page being rendered; its path travels as `_path` so the action knows the route params and where to redirect. */
	page: { path: string };
};

/** The action URL around its `name`, so the isolate can build it without a host call. */
export const actionUrlParts = (input: ActionUrlInput) => ({
	prefix: `${input.baseUrl}/apps/${input.app.namespace}/_actions/${input.actionPageId}/${input.blockId}/`,
	suffix: `?_path=${encodeURIComponent(input.page.path)}`,
});

export const buildActionUrl = (input: ActionUrlInput, name: string): string => {
	const { prefix, suffix } = actionUrlParts(input);
	return `${prefix}${name}${suffix}`;
};
