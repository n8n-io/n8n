import type { CredentialTypeAvailability } from '@n8n/api-types';
import {
	getCredentialTypeRestriction,
	getNodeTypeRestriction,
	type TypeRestriction,
} from '@n8n/frontend-module-type-availability-policies';
import { HTTP_REQUEST_NODE_TYPE, type ICredentialType } from 'n8n-workflow';

import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCredentialsStore } from '../credentials.store';

const HTTP_REQUEST_PARENT_TYPES = ['oAuth2Api', 'oAuth1Api'];

export type CredentialTypeUsability =
	| { reason: 'typeRestricted'; restriction: CredentialTypeAvailability }
	| { reason: 'nodesRestricted'; restriction: TypeRestriction; nodeTypeNames: string[] };

/**
 * Mirrors the `credentialTypes` of the HTTP Request predefined credential parameter
 * (`extends:oAuth2Api`, `extends:oAuth1Api`, `has:authenticate`).
 */
export function isUsableByHttpRequest(
	credentialType: ICredentialType,
	getCredentialType: (name: string) => ICredentialType | undefined,
): boolean {
	if (credentialType.restrictToSupportedNodes) return false;
	if (credentialType.authenticate !== undefined && credentialType.genericAuth !== true) return true;

	return (credentialType.extends ?? []).some((parentName) => {
		if (HTTP_REQUEST_PARENT_TYPES.includes(parentName)) return true;
		const parent = getCredentialType(parentName);
		return parent ? isUsableByHttpRequest(parent, getCredentialType) : false;
	});
}

/**
 * Why no workflow in the loaded project can use a credential type: a policy blocks the type,
 * or blocks every node that could use it, HTTP Request included.
 */
export function useCredentialTypeUsability() {
	const credentialsStore = useCredentialsStore();
	const nodeTypesStore = useNodeTypesStore();

	function getNodesRestriction(
		credentialType: ICredentialType,
	): Extract<CredentialTypeUsability, { reason: 'nodesRestricted' }> | null {
		const nodeTypes = credentialType.supportedNodes ?? [];
		if (nodeTypes.length === 0) return null;

		const restrictions: TypeRestriction[] = [];
		for (const nodeType of nodeTypes) {
			const restriction = getNodeTypeRestriction(nodeType);
			if (!restriction) return null;
			restrictions.push(restriction);
		}

		// Checked last: it follows the `extends` chain, and most types have an allowed node.
		const getCredentialType = (name: string) =>
			credentialsStore.getCredentialTypeByName(name) ?? undefined;
		if (
			isUsableByHttpRequest(credentialType, getCredentialType) &&
			!getNodeTypeRestriction(HTTP_REQUEST_NODE_TYPE)
		) {
			return null;
		}

		const nodeTypeNames = [
			...new Set(
				nodeTypes.map((nodeType) => nodeTypesStore.getNodeType(nodeType)?.displayName ?? nodeType),
			),
		];
		// Allowing one node is enough, so point at the admin with the narrowest reach.
		const restriction =
			restrictions.find((verdict) => verdict.scope === 'project' || verdict.optInAvailable) ??
			restrictions[0];

		return { reason: 'nodesRestricted', restriction, nodeTypeNames };
	}

	function getCredentialTypeUsability(credentialTypeName: string): CredentialTypeUsability | null {
		const restriction = getCredentialTypeRestriction(credentialTypeName);
		if (restriction) return { reason: 'typeRestricted', restriction };

		const credentialType = credentialsStore.getCredentialTypeByName(credentialTypeName);
		return credentialType ? getNodesRestriction(credentialType) : null;
	}

	return { getCredentialTypeUsability };
}
