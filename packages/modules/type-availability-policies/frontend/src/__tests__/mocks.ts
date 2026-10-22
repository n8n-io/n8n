import type { CredentialTypeAvailabilityScope, NodeTypeAvailabilityScope } from '@n8n/api-types';
import type { Project } from '@n8n/rest-api-client';
import { vi } from 'vitest';

import { useTypeAvailabilityPoliciesStore } from '../type-availability-policies.store';

/**
 * Makes the active pinia's policy store report these node types as restricted. Call after
 * `setActivePinia` (or after rendering with the pinia the component uses).
 */
export function mockRestrictedNodeTypes(
	restricted: Record<string, NodeTypeAvailabilityScope> = {},
): void {
	vi.spyOn(useTypeAvailabilityPoliciesStore(), 'getNodeTypeAvailability').mockImplementation(
		(name) => {
			const scope = restricted[name];
			return scope ? { name, available: false, scope } : { name, available: true };
		},
	);
}

/** The credential-type counterpart of `mockRestrictedNodeTypes`. */
export function mockRestrictedCredentialTypes(
	restricted: Record<string, CredentialTypeAvailabilityScope> = {},
): void {
	vi.spyOn(useTypeAvailabilityPoliciesStore(), 'getCredentialTypeAvailability').mockImplementation(
		(name) => {
			const scope = restricted[name];
			return scope ? { name, available: false, scope } : { name, available: true };
		},
	);
}

export function mockPolicyProject(project: Pick<Project, 'type'> & Partial<Project>): void {
	useTypeAvailabilityPoliciesStore().policyProject = {
		id: 'project-1',
		name: 'Acme',
		icon: null,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		relations: [],
		scopes: [],
		rolesManaged: false,
		...project,
	};
}

export const contactAdminModalStub = {
	props: ['open', 'nodeTypeName', 'audience'],
	emits: ['update:open'],
	template:
		'<div v-if="open" data-test-id="contact-admin-modal" :data-audience="audience">{{ nodeTypeName }}<button data-test-id="contact-admin-close" @click="$emit(\'update:open\', false)" /></div>',
};
