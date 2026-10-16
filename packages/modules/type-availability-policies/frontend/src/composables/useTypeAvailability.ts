import type { CredentialTypeAvailability } from '@n8n/api-types';
import { toValue, watch, type MaybeRefOrGetter } from 'vue';

import {
	getCredentialTypeRestriction,
	getNodeTypeRestriction,
	type TypeRestriction,
} from './useNodeTypeRestriction';
import { useTypeAvailabilityPoliciesStore } from '../type-availability-policies.store';

/**
 * The entry point for a surface that lists, adds or configures node or credential types. It
 * loads the policies of `projectId` and answers for that project, whichever project is active.
 */
export function useTypeAvailability(projectId: MaybeRefOrGetter<string | null | undefined>) {
	const store = useTypeAvailabilityPoliciesStore();

	watch(
		() => toValue(projectId),
		(id) => {
			if (id) void store.fetchForProject(id);
		},
		{ immediate: true },
	);

	function nodeTypeRestriction(nodeType: string): TypeRestriction | null {
		const id = toValue(projectId);
		return id ? getNodeTypeRestriction(nodeType, id) : null;
	}

	function credentialTypeRestriction(credentialType: string): CredentialTypeAvailability | null {
		const id = toValue(projectId);
		return id ? getCredentialTypeRestriction(credentialType, id) : null;
	}

	return { nodeTypeRestriction, credentialTypeRestriction };
}
