import {
	featureMaturity,
	type FeatureMaturity,
	type FeatureMaturityId,
} from '@n8n/frontend-constants/feature-maturity';
import { computed, inject, type ComputedRef, type InjectionKey } from 'vue';

/**
 * The app provides this. True when the instance is on an enterprise plan.
 * A component that renders outside the app reads false.
 */
export const EnterprisePlanKey: InjectionKey<ComputedRef<boolean>> = Symbol('EnterprisePlan');

/**
 * Keeps the test ids that pages already use. A new feature id becomes kebab-case.
 */
const TEST_IDS: Partial<Record<FeatureMaturityId, string>> = {
	assistant: 'n8n-agent',
	chat: 'chat-hub',
	context: 'settings-context',
	endUserCredentials: 'end-user-credentials',
	n8nPackages: 'n8n-packages',
	openTelemetry: 'open-telemetry',
	workflowReviews: 'security-workflow-reviews',
};

export function featureMaturityTestId(id: FeatureMaturityId): string {
	return TEST_IDS[id] ?? id.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

export function readFeatureMaturity(id: FeatureMaturityId): FeatureMaturity {
	return featureMaturity[id];
}

/** The plan provided by the app. False when the app provided none. */
export function useEnterprisePlan(): ComputedRef<boolean> {
	return inject(
		EnterprisePlanKey,
		computed(() => false),
	);
}
