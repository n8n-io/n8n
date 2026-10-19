import { z } from 'zod';

import type { ProjectIcon } from './project.schema';

/**
 * Why the SCIM bearer check rejected a request from the identity provider.
 * - `missing_header`: the request has no `Authorization: Bearer` header.
 * - `invalid_token`: the token is not a SCIM token of this instance.
 * - `superseded_token`: this instance issued the token, but an admin rotated
 *   or revoked it.
 */
export const scimAuthFailureReasonSchema = z.enum([
	'missing_header',
	'invalid_token',
	'superseded_token',
]);

/** The last SCIM request that the bearer check rejected. */
export const scimAuthFailureSchema = z.object({
	/** ISO timestamp of the request. */
	at: z.string().datetime(),
	reason: scimAuthFailureReasonSchema,
});

export type ScimAuthFailureReason = z.infer<typeof scimAuthFailureReasonSchema>;
export type ScimAuthFailure = z.infer<typeof scimAuthFailureSchema>;

/**
 * Connection state of the identity provider, from the requests that arrive.
 * - `waiting`: no request used the current token yet.
 * - `connected`: the last recorded request used the current token.
 * - `error`: the last recorded request failed the bearer check.
 */
export type ScimConnectionStatus = 'waiting' | 'connected' | 'error';

export type ScimTokenCreator = {
	id: string;
	firstName: string | null;
	lastName: string | null;
};

export type ScimTokenDetails = {
	/** ISO timestamp. A rotation sets a new value. */
	createdAt: string;
	/** Null after the creator was deleted. */
	createdBy: ScimTokenCreator | null;
	/** ISO timestamp of the last recorded request with this token, or null. */
	lastUsedAt: string | null;
};

/**
 * What n8n does when the identity provider deletes a user.
 * - `disable`: deactivate the user and keep the user's work.
 * - `delete`: delete the user. `dataAction` tells what happens to the work.
 */
export const scimOnDeleteSchema = z.enum(['disable', 'delete']);

/**
 * What happens to the work of a user that SCIM deletes.
 * - `transfer`: move the workflows and credentials to the transfer target.
 * - `delete`: delete them together with the personal project of the user.
 */
export const scimDataActionSchema = z.enum(['transfer', 'delete']);

/** How n8n applies `DELETE /scim/v2/Users/:id`. */
export const scimDeprovisioningPolicySchema = z.object({
	onDelete: scimOnDeleteSchema,
	dataAction: scimDataActionSchema,
	/**
	 * The project that gets the work of a deleted user. Null sends the work to
	 * the personal project of the instance owner.
	 */
	transferProjectId: z.string().nullable(),
});

export type ScimOnDelete = z.infer<typeof scimOnDeleteSchema>;
export type ScimDataAction = z.infer<typeof scimDataActionSchema>;
export type ScimDeprovisioningPolicy = z.infer<typeof scimDeprovisioningPolicySchema>;

/** The stored transfer target, as the SCIM settings page shows it. */
export type ScimTransferTarget = {
	projectId: string;
	/**
	 * `person` is the personal project of a user. `project` is a team project.
	 * Null when the project no longer exists.
	 */
	kind: 'person' | 'project' | null;
	/** Full name of the person, or the project name. Null when the project no longer exists. */
	name: string | null;
	/** Only for `person`. */
	email?: string;
	/** Only for `project`. */
	icon?: ProjectIcon | null;
	/**
	 * False when the project no longer exists or the person is deactivated.
	 * SCIM DELETE then sends the work to the personal project of the owner.
	 */
	valid: boolean;
};

/** Response of `GET /rest/scim/config`. */
export type ScimConfigResponse = {
	enabled: boolean;
	hasToken: boolean;
	/** Last four characters of the token, or null without a token. */
	tokenHint: string | null;
	baseUrl: string;
	/** Null when the instance has no SCIM token. */
	token: ScimTokenDetails | null;
	/** Null when no request failed the bearer check since the last reset. */
	lastAuthFailure: ScimAuthFailure | null;
	status: ScimConnectionStatus;
	/** Number of users that SCIM provisioning created, deactivated users included. */
	provisionedCount: number;
	/** Number of users that SCIM provisioning created and that are deactivated. */
	deactivatedCount: number;
	onDelete: ScimOnDelete;
	dataAction: ScimDataAction;
	/**
	 * Null when no target is stored. SCIM DELETE then sends the work to the
	 * personal project of the owner.
	 */
	transferTarget: ScimTransferTarget | null;
};

/** Response of `PATCH /rest/scim/config`: the stored state after the change. */
export type ScimConfigPatchResponse = ScimDeprovisioningPolicy & { enabled: boolean };
