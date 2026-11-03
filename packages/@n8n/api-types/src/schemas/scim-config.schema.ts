import { z } from 'zod';

import type { ProjectIcon } from './project.schema';

/**
 * What n8n does when the identity provider deletes a user.
 * - `disable`: deactivate the user and keep the user's work.
 * - `delete`: delete the user. `dataAction` tells what happens to the work.
 *   An admin is only deactivated and keeps their work. The instance owner is
 *   never deactivated or deleted.
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
	transferProjectId: z.string().min(1).nullable(),
});

export type ScimDeprovisioningPolicy = z.infer<typeof scimDeprovisioningPolicySchema>;

/**
 * A section of the transfer target picker.
 * - `people`: the personal projects of active users.
 * - `projects`: the team projects.
 */
export const scimTransferTargetTypeSchema = z.enum(['people', 'projects']);

/** A person in the transfer target picker: the personal project of an active user. */
export type ScimTransferTargetPerson = {
	projectId: string;
	userId: string;
	firstName: string | null;
	lastName: string | null;
	email: string | null;
	/** Slug of the global role, for example `global:admin`. */
	role: string;
};

/** A team project in the transfer target picker. */
export type ScimTransferTargetProject = {
	projectId: string;
	name: string;
	icon: ProjectIcon | null;
};

type ScimTransferTargetSection<Item> = {
	/** Number of valid targets in this section that match the search. */
	total: number;
	/** One page of the matches. */
	items: Item[];
};

/**
 * Response of `GET /rest/scim/transfer-targets`. Every item is a valid
 * transfer target for the SCIM deprovisioning policy.
 *
 * People are sorted by name and email. Projects are sorted by name.
 */
export type ScimTransferTargetsResponse = {
	/** Absent when the request asks for `projects` only. */
	people?: ScimTransferTargetSection<ScimTransferTargetPerson>;
	/** Absent when the request asks for `people` only. */
	projects?: ScimTransferTargetSection<ScimTransferTargetProject>;
};

/** Response of `GET /rest/scim/config`: the provisioning state and the deprovisioning policy. */
export type ScimConfigResponse = ScimDeprovisioningPolicy & {
	enabled: boolean;
	hasToken: boolean;
	/** Last four characters of the token, or null without a token. */
	tokenHint: string | null;
	baseUrl: string;
};
