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
) {
	const contact = computed(() => getRestrictionContact(toValue(verdict), toValue(projectId)));
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
type RestrictedNodeTypeName = RestrictionVerdict & { displayName: string };

const RESTRICTED_SCOPES: Array<[NodeTypeAvailabilityScope | undefined, BaseTextKey]> = [
	['instance', SCOPE_LABEL_KEY.instance],
	['project', SCOPE_LABEL_KEY.project],
	[undefined, 'typeAvailabilityPolicies.restrictedNodes.scope.generic'],
];

function sharedRestrictionContact(verdicts: RestrictionVerdict[]): RestrictionContact {
	const contacts = new Set(verdicts.map((verdict) => getRestrictionContact(verdict)));
	const [first] = contacts;
	if (contacts.size === 1) return first;
	return [...contacts].every((contact) => RESTRICTION_CONTACT_COPY[contact].audience === 'project')
		? 'project'
		: 'instance';
}

/** Why these node types block a publish, with one scope on each line when there are several. */
export function describeRestrictedNodeTypes(restricted: RestrictedNodeTypeName[]): string {
	if (restricted.length === 1) {
		const [{ displayName, ...verdict }] = restricted;
		return describeNodeTypeRestriction(displayName, verdict, 'replace');
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
		i18n.baseText(RESTRICTION_CONTACT_COPY[sharedRestrictionContact(restricted)].severalNextStep),
	].join('\n');
}

export type RestrictionMessage = NodeTypeAvailabilityScope | 'optIn' | 'generic';

export function getRestrictionMessage(
	verdict: OptionalVerdict,
	projectId?: string,
): RestrictionMessage {
	if (getRestrictionContact(verdict, projectId) === 'optIn') return 'optIn';
	return verdict?.scope ?? 'generic';
}

const AGENT_TOOL_DESCRIPTION_KEY: Record<RestrictionMessage, BaseTextKey> = {
	instance: 'typeAvailabilityPolicies.restrictedNode.agentTool.instance',
	project: 'typeAvailabilityPolicies.restrictedNode.agentTool.project',
	optIn: 'typeAvailabilityPolicies.restrictedNode.agentTool.optIn',
	generic: 'typeAvailabilityPolicies.restrictedNode.agentTool.generic',
};

export function describeAgentToolRestriction(
	nodeTypeName: string,
	verdict: OptionalVerdict,
): string {
	return useI18n().baseText(AGENT_TOOL_DESCRIPTION_KEY[getRestrictionMessage(verdict)], {
		interpolate: { nodeType: nodeTypeName },
	});
}

export function useNodeTypeRestriction(nodeType: MaybeRefOrGetter<string | null | undefined>) {
	const restriction = computed(() => {
		const type = toValue(nodeType);
		return type ? getNodeTypeRestriction(type) : null;
	});

	const isRestricted = computed(() => restriction.value !== null);
	const restrictionScope = computed(() => restriction.value?.scope);

	return { restriction, isRestricted, restrictionScope };
}
