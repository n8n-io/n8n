import {
	getCurrentProjectRestrictionLookup,
	SCOPE_LABEL_KEY,
	type RestrictedTypeKind,
	type TypeRestriction,
	type TypeRestrictionLookup,
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

export type { CredentialTypeUsability };

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
 * Why no workflow in a project can use a credential type: a policy blocks the type, or blocks
 * every node that could use it, HTTP Request included. Reads the open project unless the caller
 * passes the lookup of another one.
 */
export function useCredentialTypeUsability() {
	const credentialsStore = useCredentialsStore();
	const nodeTypesStore = useNodeTypesStore();
	const i18n = useI18n();

	function getNodesRestriction(
		credentialType: ICredentialType,
		lookup: TypeRestrictionLookup,
	): Extract<CredentialTypeUsability, { reason: 'nodesRestricted' }> | null {
		const nodeTypes = credentialType.supportedNodes ?? [];
		if (nodeTypes.length === 0) return null;

		const restrictions: TypeRestriction[] = [];
		for (const nodeType of nodeTypes) {
			const restriction = lookup.nodeTypeRestriction(nodeType);
			if (!restriction) return null;
			restrictions.push(restriction);
		}

		// Checked last: it follows the `extends` chain, and most types have an allowed node.
		const getCredentialType = (name: string) =>
			credentialsStore.getCredentialTypeByName(name) ?? undefined;
		if (
			isUsableByHttpRequest(credentialType, getCredentialType) &&
			!lookup.nodeTypeRestriction(HTTP_REQUEST_NODE_TYPE)
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

	function getCredentialTypeUsability(
		credentialTypeName: string,
		lookup: TypeRestrictionLookup = getCurrentProjectRestrictionLookup(),
	): CredentialTypeUsability | null {
		const restriction = lookup.credentialTypeRestriction(credentialTypeName);
		if (restriction) return { reason: 'typeRestricted', restriction };

		const credentialType = credentialsStore.getCredentialTypeByName(credentialTypeName);
		return credentialType ? getNodesRestriction(credentialType, lookup) : null;
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

	return { getCredentialTypeUsability, describeCredentialTypeUsability };
}
