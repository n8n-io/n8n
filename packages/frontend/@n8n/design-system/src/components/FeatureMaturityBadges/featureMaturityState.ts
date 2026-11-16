import { computed, inject, type ComputedRef, type InjectionKey } from 'vue';

/** One feature's badge flags. The app owns the list. The design system only reads it. */
export type FeatureMaturityEntry = {
	/** Show the Preview badge. */
	preview: boolean;
	/** Show Limited enterprise readiness on an enterprise plan. */
	limitedEnterpriseSupport: boolean;
	/** Test id prefix when the feature id is not the prefix pages already use. */
	testId?: string;
};

/** Feature id to badge flags. An unknown id renders no feature badges. */
export type FeatureMaturityCatalog = Record<string, FeatureMaturityEntry>;

/**
 * The app provides this. True when the instance is on an enterprise plan.
 * A component that renders outside the app reads false.
 */
export const EnterprisePlanKey: InjectionKey<ComputedRef<boolean>> = Symbol('EnterprisePlan');

/**
 * The app provides the feature list. Storybook provides a stub.
 * A component that renders with no list reads an empty catalog.
 */
export const FeatureMaturityKey: InjectionKey<FeatureMaturityCatalog> = Symbol('FeatureMaturity');

/** The plan provided by the app. False when the app provided none. */
export function useEnterprisePlan(): ComputedRef<boolean> {
	return inject(
		EnterprisePlanKey,
		computed(() => false),
	);
}

/** The feature list provided by the app. Empty when the app provided none. */
export function useFeatureMaturityCatalog(): FeatureMaturityCatalog {
	return inject(FeatureMaturityKey, {});
}

function featureMaturityTestId(id: string, entry: FeatureMaturityEntry): string {
	return entry.testId ?? id.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/**
 * The badges a feature entry renders.
 * `hidePreview` and `hideEnterprise` suppress a badge for one callsite.
 * An unknown id renders nothing.
 */
export function resolveFeatureMaturityBadges(
	catalog: FeatureMaturityCatalog,
	id: string | undefined,
	enterprisePlan: boolean,
	hidden: { preview?: boolean; enterprise?: boolean } = {},
): { showPreview: boolean; showEnterprise: boolean; testId?: string } {
	if (id === undefined) {
		return { showPreview: false, showEnterprise: false };
	}

	const entry = catalog[id];
	if (entry === undefined) {
		return { showPreview: false, showEnterprise: false };
	}

	return {
		showPreview: entry.preview && !hidden.preview,
		showEnterprise: entry.limitedEnterpriseSupport && enterprisePlan && !hidden.enterprise,
		testId: featureMaturityTestId(id, entry),
	};
}
