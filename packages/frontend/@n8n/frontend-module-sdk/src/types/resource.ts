/**
 * Metadata a module contributes to describe a resource type it owns. Consumed by
 * generic list surfaces (e.g. `ResourcesListLayout`).
 */
export type ResourceMetadata = {
	key: string;
	displayName: string;
	i18nKeys?: Record<string, string>;
};
