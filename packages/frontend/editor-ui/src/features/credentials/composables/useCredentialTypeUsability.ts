import type { CredentialRestriction } from '@n8n/api-types';
import {
	getCredentialTypeRestriction,
	getNodeTypeRestriction,
	SCOPE_LABEL_KEY,
	type RestrictedTypeKind,
	type TypeRestriction,
} from '@n8n/frontend-module-type-availability-policies';
import { useI18n } from '@n8n/i18n';
import { HTTP_REQUEST_NODE_TYPE, type ICredentialType } from 'n8n-workflow';

import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCredentialsStore } from '../credentials.store';
import type { CredentialTypeUsability } from '../credentials.types';
import { isCredentialTypeSupported } from '../credentials.utils';

// Same as `nodeCredentialType` in nodes-base/nodes/HttpRequest/V3/Description.ts.
const HTTP_REQUEST_CREDENTIAL_TYPES = [
	'extends:oAuth2Api',
	'extends:oAuth1Api',
	'has:authenticate',
];

export type CredentialTypeUsabilityReason = CredentialTypeUsability['reason'];

export const CREDENTIAL_TYPE_USABILITY_REASONS = [
	'typeRestricted',
	'nodesRestricted',
] as const satisfies readonly CredentialTypeUsabilityReason[];

export function parseCredentialTypeUsabilityReasons(
	values: unknown,
): CredentialTypeUsabilityReason[] {
	const given = [values]
		.flat()
		.flatMap((value) => (typeof value === 'string' ? value.split(',') : []));
	return CREDENTIAL_TYPE_USABILITY_REASONS.filter((reason) => given.includes(reason));
}

export type CredentialTypeRestrictionCopy = {
	blocked: boolean;
	kind: RestrictedTypeKind;
	restriction: TypeRestriction;
	scopeLabel: string;
	popoverScopeLabel?: string;
	description?: string;
	contactSubject: string;
};

export function isUsableByHttpRequest(
	credentialType: ICredentialType,
	getCredentialType: (name: string) => ICredentialType | undefined,
): boolean {
	return isCredentialTypeSupported(
		credentialType,
		HTTP_REQUEST_CREDENTIAL_TYPES,
		HTTP_REQUEST_NODE_TYPE,
		getCredentialType,
	);
}

/**
 * Why no workflow in the loaded project can use a credential type: a policy blocks the type,
 * or blocks every node that could use it, HTTP Request included. The credentials list gets the
 * same answer from the server for each credential's home project, see `fromCredentialRestriction`.
 */
export function useCredentialTypeUsability() {
	const credentialsStore = useCredentialsStore();
	const nodeTypesStore = useNodeTypesStore();
	const i18n = useI18n();

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

		const nodeTypeNames = toNodeTypeNames(nodeTypes);
		// Allowing one node is enough, so point at the admin with the narrowest reach.
		const restriction =
			restrictions.find((verdict) => verdict.scope === 'project' || verdict.optInAvailable) ??
			restrictions[0];

		return { reason: 'nodesRestricted', restriction, nodeTypeNames };
	}

	function toNodeTypeNames(nodeTypes: string[]): string[] {
		return [
			...new Set(
				nodeTypes.map((nodeType) => nodeTypesStore.getNodeType(nodeType)?.displayName ?? nodeType),
			),
		];
	}

	function getCredentialTypeUsability(credentialTypeName: string): CredentialTypeUsability | null {
		const restriction = getCredentialTypeRestriction(credentialTypeName);
		if (restriction) return { reason: 'typeRestricted', restriction };

		const credentialType = credentialsStore.getCredentialTypeByName(credentialTypeName);
		return credentialType ? getNodesRestriction(credentialType) : null;
	}

	/** The server's answer for a listed credential, with the node display names the copy needs. */
	function fromCredentialRestriction(restriction: CredentialRestriction): CredentialTypeUsability {
		if (restriction.reason === 'typeRestricted') return restriction;

		return {
			reason: 'nodesRestricted',
			restriction: restriction.restriction,
			nodeTypeNames: toNodeTypeNames(restriction.nodeTypes),
		};
	}

	function describeCredentialTypeUsability(
		usability: CredentialTypeUsability,
		credentialTypeDisplayName: string,
	): CredentialTypeRestrictionCopy {
		if (usability.reason === 'typeRestricted') {
			const { scope } = usability.restriction;
			return {
				blocked: true,
				kind: 'credential',
				restriction: usability.restriction,
				scopeLabel: i18n.baseText(
					scope ? SCOPE_LABEL_KEY[scope] : 'typeAvailabilityPolicies.restrictedNodes.scope.generic',
				),
				contactSubject: credentialTypeDisplayName,
			};
		}

		const scopeLabel = i18n.baseText(
			'typeAvailabilityPolicies.restrictedCredentialType.nodesRestricted.scope',
		);
		return {
			blocked: false,
			kind: 'node',
			restriction: usability.restriction,
			scopeLabel,
			popoverScopeLabel: scopeLabel,
			description: i18n.baseText(
				'typeAvailabilityPolicies.restrictedCredentialType.nodesRestricted.description',
				{ interpolate: { nodeTypes: usability.nodeTypeNames.join(', ') } },
			),
			contactSubject: usability.nodeTypeNames.join(', '),
		};
	}

	return { getCredentialTypeUsability, fromCredentialRestriction, describeCredentialTypeUsability };
}
