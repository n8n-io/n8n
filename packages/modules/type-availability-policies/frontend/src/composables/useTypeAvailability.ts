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
 * loads the policies of `projectId`. The store holds one project, so while another project is
 * loaded every lookup here reports no restriction.
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

	const isLoadedForProject = () => {
		const id = toValue(projectId);
		return !!id && store.loadedProjectId === id;
	};

	function nodeTypeRestriction(nodeType: string): TypeRestriction | null {
		return isLoadedForProject() ? getNodeTypeRestriction(nodeType) : null;
	}

	function credentialTypeRestriction(credentialType: string): CredentialTypeAvailability | null {
		return isLoadedForProject() ? getCredentialTypeRestriction(credentialType) : null;
	}

	return { nodeTypeRestriction, credentialTypeRestriction };
}
