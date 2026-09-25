/** The scope whose policy decided a credential type's availability. */
export type CredentialTypeAvailabilityScope = 'instance' | 'project';

/**
 * One credential type's effective availability in a project, composed from the instance and
 * project policies. Optional fields are present only on unavailable entries, so the
 * response stays cheap for the common case of a fully available type.
 */
export type CredentialTypeAvailability = {
	name: string;
	available: boolean;
	/** The denying scope. */
	scope?: CredentialTypeAvailabilityScope;
	/** The rule that denied, absent when the scope's default action decided. */
	matchedRuleId?: string;
	/** The instance policy delegates this type, so the project can allow it for itself. */
	optInAvailable?: boolean;
};

/** Response of `GET /projects/:projectId/available-credential-types`. */
export type AvailableCredentialTypesResponse = CredentialTypeAvailability[];
