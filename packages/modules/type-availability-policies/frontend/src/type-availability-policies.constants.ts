import type { NodeTypeAvailabilityScope } from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';

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

export type ContactAudience = 'instance' | 'project';

export const CONTACT_ADMIN_COPY: Record<
	ContactAudience,
	{
		action: BaseTextKey;
		dialogTitle: BaseTextKey;
		empty: BaseTextKey;
		dialogDescription: Record<RestrictedTypeKind, BaseTextKey>;
		popoverDescription: Record<RestrictedTypeKind, BaseTextKey>;
	}
> = {
	instance: {
		action: 'typeAvailabilityPolicies.restrictedNode.contactAdmin',
		dialogTitle: 'typeAvailabilityPolicies.contactAdmin.title',
		empty: 'typeAvailabilityPolicies.contactAdmin.empty',
		dialogDescription: {
			node: 'typeAvailabilityPolicies.contactAdmin.description',
			credential: 'typeAvailabilityPolicies.contactAdmin.credentialType.description',
		},
		popoverDescription: {
			node: 'typeAvailabilityPolicies.restrictedNode.popover.description',
			credential: 'typeAvailabilityPolicies.restrictedCredentialType.popover.description',
		},
	},
	project: {
		action: 'typeAvailabilityPolicies.restrictedNode.contactProjectAdmin',
		dialogTitle: 'typeAvailabilityPolicies.contactProjectAdmin.title',
		empty: 'typeAvailabilityPolicies.contactProjectAdmin.empty',
		dialogDescription: {
			node: 'typeAvailabilityPolicies.contactProjectAdmin.description',
			credential: 'typeAvailabilityPolicies.contactProjectAdmin.credentialType.description',
		},
		popoverDescription: {
			node: 'typeAvailabilityPolicies.restrictedNode.popover.description.project',
			credential: 'typeAvailabilityPolicies.restrictedCredentialType.popover.description.project',
		},
	},
};

export const OPT_IN_POPOVER_DESCRIPTION: Record<RestrictedTypeKind, BaseTextKey> = {
	node: 'typeAvailabilityPolicies.restrictedNode.popover.description.optIn',
	credential: 'typeAvailabilityPolicies.restrictedCredentialType.popover.description.optIn',
};
