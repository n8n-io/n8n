import {
	computed,
	inject,
	toValue,
	type ComputedRef,
	type InjectionKey,
	type MaybeRefOrGetter,
} from 'vue';

export type FeatureMaturityEntry = {
	/** Show the Preview badge. */
	preview: boolean;
	/** Show the Limited enterprise readiness badge. */
	limitedEnterpriseSupport: boolean;
	/**
	 * Documentation page for this feature.
	 * `N8nSettingsPageHeader` reads this URL for the docs link.
	 */
	docsUrl?: string;
};

/** Feature id to badge flags. A missing id renders no feature badges. */
export type FeatureMaturityCatalog = {
	readonly [id: string]: FeatureMaturityEntry | undefined;
};

export const FeatureMaturityKey: InjectionKey<MaybeRefOrGetter<FeatureMaturityCatalog>> =
	Symbol('FeatureMaturity');

/** The feature list provided by the app. Empty when the app provided none. */
export function useFeatureMaturityCatalog(): ComputedRef<FeatureMaturityCatalog> {
	const provided = inject(FeatureMaturityKey, {});
	return computed(() => toValue(provided));
}

function featureMaturityTestId(id: string): string {
	return id.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

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

export function featureMaturityForPlan(
	catalog: FeatureMaturityCatalog,
	isEnterprisePlan: boolean,
): FeatureMaturityCatalog {
	if (isEnterprisePlan) return catalog;

	const visible: { [id: string]: FeatureMaturityEntry } = {};
	for (const [id, entry] of Object.entries(catalog)) {
		if (entry === undefined) continue;
		visible[id] = {
			preview: entry.preview,
			limitedEnterpriseSupport: false,
			...(entry.docsUrl === undefined ? {} : { docsUrl: entry.docsUrl }),
		};
	}
	return visible;
}
