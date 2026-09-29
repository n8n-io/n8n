import type { NodeTypeAvailability, NodeTypeAvailabilityScope } from '@n8n/api-types';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';

import { useTypeAvailabilityPoliciesStore } from '../type-availability-policies.store';

export function getNodeTypeRestriction(nodeType: string): NodeTypeAvailability | null {
	const availability = useTypeAvailabilityPoliciesStore().getNodeTypeAvailability(nodeType);
	return availability && !availability.available ? availability : null;
}

export function isNodeTypeRestricted(nodeType: string): boolean {
	return getNodeTypeRestriction(nodeType) !== null;
}

const DESCRIPTION_KEY: Record<NodeTypeAvailabilityScope, BaseTextKey> = {
	instance: 'typeAvailabilityPolicies.restrictedNode.description.instance',
	project: 'typeAvailabilityPolicies.restrictedNode.description.project',
};

const NEXT_STEP_KEY = {
	contact: 'typeAvailabilityPolicies.restrictedNode.nextStep.contact',
	replace: 'typeAvailabilityPolicies.restrictedNode.nextStep.replace',
} satisfies Record<string, BaseTextKey>;

export function describeNodeTypeRestriction(
	nodeTypeName: string,
	scope?: NodeTypeAvailabilityScope,
	nextStepKind: keyof typeof NEXT_STEP_KEY = 'contact',
): string {
	const i18n = useI18n();
	const nextStep = i18n.baseText(NEXT_STEP_KEY[nextStepKind]);
	return i18n.baseText(
		scope ? DESCRIPTION_KEY[scope] : 'typeAvailabilityPolicies.restrictedNode.description.generic',
		{ interpolate: { nodeType: nodeTypeName, nextStep } },
	);
}

export function useNodeTypeRestriction(nodeType: MaybeRefOrGetter<string | null | undefined>) {
	const restriction = computed(() => {
		const type = toValue(nodeType);
		return type ? getNodeTypeRestriction(type) : null;
	});

	const isRestricted = computed(() => restriction.value !== null);
	const restrictionScope = computed(() => restriction.value?.scope);

	return { isRestricted, restrictionScope };
}
