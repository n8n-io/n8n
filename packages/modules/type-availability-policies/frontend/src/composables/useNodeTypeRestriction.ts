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

export function describeNodeTypeRestriction(
	nodeTypeName: string,
	scope?: NodeTypeAvailabilityScope,
	nextStep: 'contact' | 'replace' = 'contact',
): string {
	const i18n = useI18n();
	const nextStepText = i18n.baseText(
		nextStep === 'replace'
			? 'typeAvailabilityPolicies.restrictedNode.nextStep.replace'
			: 'typeAvailabilityPolicies.restrictedNode.nextStep.contact',
	);
	return i18n.baseText(
		scope ? DESCRIPTION_KEY[scope] : 'typeAvailabilityPolicies.restrictedNode.description.generic',
		{ interpolate: { nodeType: nodeTypeName, nextStep: nextStepText } },
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
