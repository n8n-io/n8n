/**
 * Invalidation-only signal: the user's side panel views changed, so clients
 * refetch them.
 */
export type UiExtensionViewsChanged = {
	type: 'uiExtensionViewsChanged';
	data: Record<string, never>;
};

export type UiExtensionsPushMessage = UiExtensionViewsChanged;
