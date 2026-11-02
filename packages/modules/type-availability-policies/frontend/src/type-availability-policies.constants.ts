import type { NodeTypeAvailabilityScope } from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';
import type { Scope } from '@n8n/permissions';

/** Must stay the same as the backend module id: `settings.activeModules` is keyed by it. */
export const TYPE_AVAILABILITY_POLICIES_MODULE_ID = 'type-availability-policies';

export const TYPE_AVAILABILITY_POLICIES_STORE_ID = 'typeAvailabilityPolicies';

export const SCOPE_LABEL_KEY: Record<NodeTypeAvailabilityScope, BaseTextKey> = {
	instance: 'typeAvailabilityPolicies.restrictedNode.scope.instance',
	project: 'typeAvailabilityPolicies.restrictedNode.scope.project',
};

export function isRestrictionScope(scope: string): scope is NodeTypeAvailabilityScope {
	return Object.hasOwn(SCOPE_LABEL_KEY, scope);
}

export type RestrictedTypeKind = 'node' | 'credential';

export const RESTRICTED_TYPE_COPY: Record<
	RestrictedTypeKind,
	{ title: BaseTextKey; mailSubject: BaseTextKey }
> = {
	node: {
		title: 'typeAvailabilityPolicies.restrictedNode.title',
		mailSubject: 'typeAvailabilityPolicies.contactAdmin.mailSubject',
	},
	credential: {
		title: 'typeAvailabilityPolicies.restrictedCredentialType.title',
		mailSubject: 'typeAvailabilityPolicies.contactAdmin.credentialType.mailSubject',
	},
};

export const POLICY_MANAGE_SCOPE = {
	node: 'nodeTypePolicy:manage',
	credential: 'credentialTypePolicy:manage',
} as const satisfies Record<RestrictedTypeKind, Scope>;

export type ContactAudience = NodeTypeAvailabilityScope;

export type RestrictionContact = ContactAudience | 'optIn';

export type RestrictionNextStep = 'contact' | 'replace';

export const RESTRICTION_CONTACT_COPY: Record<
	RestrictionContact,
	{
		audience: ContactAudience;
		action: BaseTextKey;
		popoverDescription: Record<RestrictedTypeKind, BaseTextKey>;
		nextStep: Record<RestrictionNextStep, BaseTextKey>;
		severalNextStep: BaseTextKey;
	}
> = {
	instance: {
		audience: 'instance',
		action: 'typeAvailabilityPolicies.restrictedNode.contactAdmin',
		popoverDescription: {
			node: 'typeAvailabilityPolicies.restrictedNode.popover.description',
			credential: 'typeAvailabilityPolicies.restrictedCredentialType.popover.description',
		},
		nextStep: {
			contact: 'typeAvailabilityPolicies.restrictedNode.nextStep.contact',
			replace: 'typeAvailabilityPolicies.restrictedNode.nextStep.replace',
		},
		severalNextStep: 'typeAvailabilityPolicies.restrictedNodes.nextStep',
	},
	project: {
		audience: 'project',
		action: 'typeAvailabilityPolicies.restrictedNode.contactProjectAdmin',
		popoverDescription: {
			node: 'typeAvailabilityPolicies.restrictedNode.popover.description.project',
			credential: 'typeAvailabilityPolicies.restrictedCredentialType.popover.description.project',
		},
		nextStep: {
			contact: 'typeAvailabilityPolicies.restrictedNode.nextStep.project.contact',
			replace: 'typeAvailabilityPolicies.restrictedNode.nextStep.project.replace',
		},
		severalNextStep: 'typeAvailabilityPolicies.restrictedNodes.nextStep.project',
	},
	optIn: {
		audience: 'project',
		action: 'typeAvailabilityPolicies.restrictedNode.contactProjectAdmin',
		popoverDescription: {
			node: 'typeAvailabilityPolicies.restrictedNode.popover.description.optIn',
			credential: 'typeAvailabilityPolicies.restrictedCredentialType.popover.description.optIn',
		},
		nextStep: {
			contact: 'typeAvailabilityPolicies.restrictedNode.nextStep.optIn.contact',
			replace: 'typeAvailabilityPolicies.restrictedNode.nextStep.optIn.replace',
		},
		severalNextStep: 'typeAvailabilityPolicies.restrictedNodes.nextStep.optIn',
	},
};

export const CONTACT_DIALOG_COPY: Record<
	ContactAudience,
	{ title: BaseTextKey; empty: BaseTextKey; description: Record<RestrictedTypeKind, BaseTextKey> }
> = {
	instance: {
		title: 'typeAvailabilityPolicies.contactAdmin.title',
		empty: 'typeAvailabilityPolicies.contactAdmin.empty',
		description: {
			node: 'typeAvailabilityPolicies.contactAdmin.description',
			credential: 'typeAvailabilityPolicies.contactAdmin.credentialType.description',
		},
	},
	project: {
		title: 'typeAvailabilityPolicies.contactProjectAdmin.title',
		empty: 'typeAvailabilityPolicies.contactProjectAdmin.empty',
		description: {
			node: 'typeAvailabilityPolicies.contactProjectAdmin.description',
			credential: 'typeAvailabilityPolicies.contactProjectAdmin.credentialType.description',
		},
	},
};
