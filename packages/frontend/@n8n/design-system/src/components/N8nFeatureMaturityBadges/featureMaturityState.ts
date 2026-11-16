import {
	computed,
	inject,
	toValue,
	type ComputedRef,
	type InjectionKey,
	type MaybeRefOrGetter,
} from 'vue';

/** One feature's badge flags. The app owns the list. The design system only reads it. */
export type FeatureMaturityEntry = {
	/** Show the Preview badge. */
	preview: boolean;
	/** Show the Limited enterprise readiness badge. */
	limitedEnterpriseSupport: boolean;
	/**
	 * Documentation page for this feature.
	 * `N8nSettingsPageHeader` renders the link. A page `docs-url` overrides it.
	 */
	docsUrl?: string;
};

/** Feature id to badge flags. A missing id renders no feature badges. */
export type FeatureMaturityCatalog = {
	readonly [id: string]: FeatureMaturityEntry | undefined;
};

/**
 * The app provides the feature list. Storybook provides a stub.
 * Provide a computed list when the badges must follow instance state.
 * A component that renders with no list reads an empty catalog.
 */
export const FeatureMaturityKey: InjectionKey<MaybeRefOrGetter<FeatureMaturityCatalog>> =
	Symbol('FeatureMaturity');

/** The feature list provided by the app. Empty when the app provided none. */
export function useFeatureMaturityCatalog(): ComputedRef<FeatureMaturityCatalog> {
	const provided = inject(FeatureMaturityKey, {});
	return computed(() => toValue(provided));
}

/**
 * Badge test id prefix for a feature id.
 * A camelCase id becomes kebab-case. `endUserCredentials` becomes `end-user-credentials`.
 * Badges append `-preview-badge` or `-enterprise-readiness-badge`.
 */
function featureMaturityTestId(id: string): string {
	return id.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/**
 * The badges a feature entry renders.
 * `hidePreview` and `hideEnterprise` suppress a badge for one callsite.
 * An unknown id renders nothing. In development it also warns.
 */
export function resolveFeatureMaturityBadges(
	catalog: FeatureMaturityCatalog,
	id: string | undefined,
	hidden: { preview?: boolean; enterprise?: boolean } = {},
): { showPreview: boolean; showEnterprise: boolean; testId?: string } {
	if (id === undefined) {
		return { showPreview: false, showEnterprise: false };
	}

	const entry = catalog[id];
	if (entry === undefined) {
		if (import.meta.env.DEV) {
			console.warn(
				`[N8nFeatureMaturityBadges] The feature list has no entry for "${id}". No badges render.`,
			);
		}
		return { showPreview: false, showEnterprise: false };
	}

	return {
		showPreview: entry.preview && !hidden.preview,
		showEnterprise: entry.limitedEnterpriseSupport && !hidden.enterprise,
		testId: featureMaturityTestId(id),
	};
}
