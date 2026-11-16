import type {
	CredentialTypeAvailability,
	NodeTypeAvailability,
	NodeTypeAvailabilityScope,
	PolicyViolation,
} from '@n8n/api-types';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { ProjectTypes, type ProjectType } from '@n8n/rest-api-client';
import {
	getCredentialOnlyNodeCredentialType,
	HTTP_REQUEST_NODE_TYPE,
	isCredentialOnlyNodeType,
} from 'n8n-workflow';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';

import {
	isRestrictionScope,
	RESTRICTION_CONTACT_COPY,
	SCOPE_LABEL_KEY,
	type RestrictedTypeKind,
	type RestrictionContact,
	type RestrictionNextStep,
} from '../type-availability-policies.constants';
import { useTypeAvailabilityPoliciesStore } from '../type-availability-policies.store';

/** The verdict that restricts a node type: from the node kind, or the credential kind for a credential-only node. */
export type TypeRestriction = NodeTypeAvailability | CredentialTypeAvailability;

function nodeRestriction(nodeType: string): NodeTypeAvailability | null {
	const availability = useTypeAvailabilityPoliciesStore().getNodeTypeAvailability(nodeType);
	return availability && !availability.available ? availability : null;
}

export function getCredentialTypeRestriction(
	credentialType: string,
): CredentialTypeAvailability | null {
	const availability =
		useTypeAvailabilityPoliciesStore().getCredentialTypeAvailability(credentialType);
	return availability && !availability.available ? availability : null;
}

/**
 * A credential-only node (`n8n-creds-base.<type>`) is HTTP Request with one credential type
 * attached, so it is restricted when either is: the node kind decides for HTTP Request, the
 * credential kind for the type it wraps. HTTP Request is read first because it is the wider
 * reason and already covers every credential-only node. This mirrors the backend, where the
 * node check judges the stored `httpRequest` node and the credential check judges its type.
 */
export function getNodeTypeRestriction(nodeType: string): TypeRestriction | null {
	if (isCredentialOnlyNodeType(nodeType)) {
		return (
			nodeRestriction(HTTP_REQUEST_NODE_TYPE) ??
			getCredentialTypeRestriction(getCredentialOnlyNodeCredentialType(nodeType))
		);
	}

	return nodeRestriction(nodeType);
}

/** The policy kind behind a node type's verdict, matching the order in `getNodeTypeRestriction`. */
export function getNodeTypeRestrictionKind(
	nodeType: string,
	restriction: TypeRestriction,
): RestrictedTypeKind {
	return isCredentialOnlyNodeType(nodeType) && restriction.name !== HTTP_REQUEST_NODE_TYPE
		? 'credential'
		: 'node';
}

export function isNodeTypeRestricted(nodeType: string): boolean {
	return getNodeTypeRestriction(nodeType) !== null;
}

export type RestrictionVerdict = Pick<TypeRestriction, 'scope' | 'optInAvailable'>;
export type OptionalVerdict = RestrictionVerdict | null | undefined;

export function getViolationVerdict(violation: PolicyViolation): RestrictionVerdict {
	return {
		scope: violation.scope && isRestrictionScope(violation.scope) ? violation.scope : undefined,
		optInAvailable: violation.optInAvailable,
	};
}

export function resolveRestrictionContact(
	verdict: OptionalVerdict,
	projectType: ProjectType | null,
): RestrictionContact {
	if (projectType !== ProjectTypes.Team) return 'instance';
	if (verdict?.scope === 'project') return 'project';
	if (verdict?.optInAvailable) return 'optIn';
	return 'instance';
}

export function getRestrictionContact(
	verdict: OptionalVerdict,
	projectId?: string,
): RestrictionContact {
	const project = useTypeAvailabilityPoliciesStore().policyProject;
	const isPolicyProject = project !== null && (projectId === undefined || project.id === projectId);
	return resolveRestrictionContact(verdict, isPolicyProject ? project.type : null);
}

export function useRestrictionContact(
	verdict: MaybeRefOrGetter<OptionalVerdict>,
	projectId?: MaybeRefOrGetter<string | undefined>,
	/** Judges a project other than the open one, such as a move destination. */
	projectType?: MaybeRefOrGetter<ProjectType | null | undefined>,
) {
	const contact = computed(() => {
		const type = toValue(projectType);
		return type === undefined
			? getRestrictionContact(toValue(verdict), toValue(projectId))
			: resolveRestrictionContact(toValue(verdict), type);
	});
	const copy = computed(() => RESTRICTION_CONTACT_COPY[contact.value]);
	return { contact, copy };
}

const DESCRIPTION_KEY: Record<NodeTypeAvailabilityScope, BaseTextKey> = {
	instance: 'typeAvailabilityPolicies.restrictedNode.description.instance',
	project: 'typeAvailabilityPolicies.restrictedNode.description.project',
};

export function describeNodeTypeRestriction(
	nodeTypeName: string,
	verdict: OptionalVerdict,
	nextStep: RestrictionNextStep = 'contact',
): string {
	const i18n = useI18n();
	const nextStepKey = RESTRICTION_CONTACT_COPY[getRestrictionContact(verdict)].nextStep[nextStep];
	return i18n.baseText(
		verdict?.scope
			? DESCRIPTION_KEY[verdict.scope]
			: 'typeAvailabilityPolicies.restrictedNode.description.generic',
		{ interpolate: { nodeType: nodeTypeName, nextStep: i18n.baseText(nextStepKey) } },
	);
}

/** A restricted node type, named as the user sees it in the node panel. */
export type RestrictedNodeTypeName = RestrictionVerdict & { displayName: string };

const RESTRICTED_SCOPES: Array<[NodeTypeAvailabilityScope | undefined, BaseTextKey]> = [
	['instance', SCOPE_LABEL_KEY.instance],
	['project', SCOPE_LABEL_KEY.project],
	[undefined, 'typeAvailabilityPolicies.restrictedNodes.scope.generic'],
];

/** One contact for several restrictions: a project admin only when one can lift all of them. */
export function sharedRestrictionContact(contacts: RestrictionContact[]): RestrictionContact {
	const unique = new Set(contacts);
	const [first = 'instance'] = unique;
	if (unique.size <= 1) return first;
	return [...unique].every((contact) => RESTRICTION_CONTACT_COPY[contact].audience === 'project')
		? 'project'
		: 'instance';
}

/** The contact copy for several restrictions at once. */
export function sharedContactCopy(verdicts: OptionalVerdict[]) {
	return RESTRICTION_CONTACT_COPY[
		sharedRestrictionContact(verdicts.map((verdict) => getRestrictionContact(verdict)))
	];
}

/**
 * The restricted types among `nodeTypes`, one entry for each type, named as the user sees them.
 * `nodeType` keeps the input type: for a credential-only node, the verdict's `name` is the
 * HTTP Request node or the credential type that denied it.
 * `restrictionOf` lets a surface judge a project other than the open one.
 */
export function collectRestrictedNodeTypes(
	nodeTypes: Iterable<string>,
	displayNameOf: (nodeType: string) => string,
	restrictionOf: (nodeType: string) => TypeRestriction | null = getNodeTypeRestriction,
): Array<TypeRestriction & { nodeType: string; displayName: string }> {
	return [...new Set(nodeTypes)].flatMap((nodeType) => {
		const restriction = restrictionOf(nodeType);
		return restriction ? [{ ...restriction, nodeType, displayName: displayNameOf(nodeType) }] : [];
	});
}

export function describeRestrictedNodeTypes(
	restricted: RestrictedNodeTypeName[],
	surface?: RestrictedCalloutSurface,
): string {
	if (restricted.length === 1) {
		const [{ displayName, ...verdict }] = restricted;
		return surface
			? describeTypeRestriction(surface, displayName, verdict)
			: describeNodeTypeRestriction(displayName, verdict, 'replace');
	}

	const i18n = useI18n();
	const scopeLines = RESTRICTED_SCOPES.flatMap(([scope, labelKey]) => {
		// Quoted because some display names contain commas.
		const names = restricted
			.filter((type) => type.scope === scope)
			.map((type) => `'${type.displayName}'`);
		if (names.length === 0) return [];

		return [
			i18n.baseText('typeAvailabilityPolicies.restrictedNodes.scopeLine', {
				interpolate: { scope: i18n.baseText(labelKey), nodeTypes: names.join(', ') },
			}),
		];
	});

	return [
		i18n.baseText('typeAvailabilityPolicies.restrictedNodes.title'),
		...scopeLines,
		i18n.baseText(sharedContactCopy(restricted).severalNextStep),
	].join('\n');
}

const IMPORTED_DESCRIPTION_KEY: Record<RestrictionContact, BaseTextKey> = {
	instance: 'typeAvailabilityPolicies.importedRestricted.description',
	project: 'typeAvailabilityPolicies.importedRestricted.description.project',
	optIn: 'typeAvailabilityPolicies.importedRestricted.description.optIn',
};

export function describeImportedRestrictions(verdicts: RestrictionVerdict[]): string {
	const contact = sharedRestrictionContact(
		verdicts.map((verdict) => getRestrictionContact(verdict)),
	);
	return useI18n().baseText(IMPORTED_DESCRIPTION_KEY[contact]);
}

export type RestrictionMessage = NodeTypeAvailabilityScope | 'optIn' | 'generic';

export function getRestrictionMessage(
	verdict: OptionalVerdict,
	projectId?: string,
): RestrictionMessage {
	if (getRestrictionContact(verdict, projectId) === 'optIn') return 'optIn';
	return verdict?.scope ?? 'generic';
}

export type RestrictedCalloutSurface = 'tool' | 'chatTool' | 'credential' | 'replaceToSave';

const CALLOUT_COPY: Record<
	RestrictedCalloutSurface,
	{
		keys: Record<RestrictionMessage, BaseTextKey>;
		interpolationKey: 'nodeType' | 'credentialType';
	}
> = {
	tool: {
		keys: {
			instance: 'typeAvailabilityPolicies.restrictedNode.agentTool.instance',
			project: 'typeAvailabilityPolicies.restrictedNode.agentTool.project',
			optIn: 'typeAvailabilityPolicies.restrictedNode.agentTool.optIn',
			generic: 'typeAvailabilityPolicies.restrictedNode.agentTool.generic',
		},
		interpolationKey: 'nodeType',
	},
	chatTool: {
		keys: {
			instance: 'typeAvailabilityPolicies.restrictedNode.chatTool.instance',
			project: 'typeAvailabilityPolicies.restrictedNode.chatTool.project',
			optIn: 'typeAvailabilityPolicies.restrictedNode.chatTool.optIn',
			generic: 'typeAvailabilityPolicies.restrictedNode.chatTool.generic',
		},
		interpolationKey: 'nodeType',
	},
	credential: {
		keys: {
			instance: 'typeAvailabilityPolicies.restrictedCredentialType.callout.instance',
			project: 'typeAvailabilityPolicies.restrictedCredentialType.callout.project',
			optIn: 'typeAvailabilityPolicies.restrictedCredentialType.callout.optIn',
			generic: 'typeAvailabilityPolicies.restrictedCredentialType.callout.generic',
		},
		interpolationKey: 'credentialType',
	},
	replaceToSave: {
		keys: {
			instance: 'typeAvailabilityPolicies.restrictedNode.replaceToSave.instance',
			project: 'typeAvailabilityPolicies.restrictedNode.replaceToSave.project',
			optIn: 'typeAvailabilityPolicies.restrictedNode.replaceToSave.optIn',
			generic: 'typeAvailabilityPolicies.restrictedNode.replaceToSave.generic',
		},
		interpolationKey: 'nodeType',
	},
};

export function describeTypeRestriction(
	surface: RestrictedCalloutSurface,
	typeName: string,
	verdict: OptionalVerdict,
): string {
	const { keys, interpolationKey } = CALLOUT_COPY[surface];
	return useI18n().baseText(keys[getRestrictionMessage(verdict)], {
		interpolate: { [interpolationKey]: typeName },
	});
}

export function describeAgentToolRestriction(
	nodeTypeName: string,
	verdict: OptionalVerdict,
): string {
	return describeTypeRestriction('tool', nodeTypeName, verdict);
}

function useTypeRestriction<T extends TypeRestriction>(
	type: MaybeRefOrGetter<string | null | undefined>,
	lookup: (type: string) => T | null,
) {
	const restriction = computed(() => {
		const name = toValue(type);
		return name ? lookup(name) : null;
	});

	return { restriction, isRestricted: computed(() => restriction.value !== null) };
}

export function useNodeTypeRestriction(nodeType: MaybeRefOrGetter<string | null | undefined>) {
	const { restriction, isRestricted } = useTypeRestriction(nodeType, getNodeTypeRestriction);

	return { restriction, isRestricted, restrictionScope: computed(() => restriction.value?.scope) };
}

export function useCredentialTypeRestriction(
	credentialType: MaybeRefOrGetter<string | null | undefined>,
) {
	return useTypeRestriction(credentialType, getCredentialTypeRestriction);
}
