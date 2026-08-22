import { z } from 'zod';

import { Z } from '../../zod-class';
import { publicApiPaginationSchema } from '../pagination/pagination.dto';

export const gitConnectionTypeSchema = z.enum(['ssh', 'https']);
export const gitKeyGeneratorTypeSchema = z.enum(['ed25519', 'rsa']);
export type GitConnectionType = z.infer<typeof gitConnectionTypeSchema>;
export type GitKeyGeneratorType = z.infer<typeof gitKeyGeneratorTypeSchema>;

const nameSchema = z.string().trim().min(1).max(128);
const repositoryUrlSchema = z.string().trim().min(1);
// branchName maps to a `varchar(255)` column — cap it so over-long input is a
// 400 at validation time rather than a 500 at insert.
const branchNameSchema = z.string().trim().min(1).max(255);

export class CreateGitConnectionDto extends Z.class({
	name: nameSchema,
	repositoryUrl: repositoryUrlSchema,
	branchName: branchNameSchema.optional(),
	connectionType: gitConnectionTypeSchema,
	keyGeneratorType: gitKeyGeneratorTypeSchema.optional(),
	username: z.string().min(1).optional(),
	password: z.string().min(1).optional(),
}) {}

export class UpdateGitConnectionDto extends Z.class({
	name: nameSchema.optional(),
	repositoryUrl: repositoryUrlSchema.optional(),
	branchName: branchNameSchema.optional(),
	connectionType: gitConnectionTypeSchema.optional(),
	keyGeneratorType: gitKeyGeneratorTypeSchema.optional(),
	username: z.string().min(1).optional(),
	password: z.string().min(1).optional(),
}) {}

export class CloneGitConnectionDto extends Z.class({
	branchName: branchNameSchema.optional(),
}) {}

export class ListGitConnectionsQueryDto extends Z.class({
	limit: publicApiPaginationSchema.limit,
	cursor: z.string().optional(),
}) {}

export const gitConnectionPublicSchema = z.object({
	id: z.string(),
	name: z.string(),
	repositoryUrl: z.string(),
	branchName: z.string().nullable(),
	connectionType: gitConnectionTypeSchema,
	publicKey: z.string().nullable(),
	keyGeneratorType: gitKeyGeneratorTypeSchema.nullable(),
	baseCommit: z.string().nullable(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

export class GitConnectionPublicDto extends Z.class(gitConnectionPublicSchema.shape) {}

/**
 * Per-entity counts of what actually landed in the exported package (after folder
 * bundling and auto-inclusion), surfaced by a push so the caller knows what was
 * written to the working copy.
 */
export const gitConnectionExportCountsSchema = z.object({
	workflows: z.number().int().nonnegative(),
	folders: z.number().int().nonnegative(),
	credentials: z.number().int().nonnegative(),
	dataTables: z.number().int().nonnegative(),
	variables: z.number().int().nonnegative(),
	tags: z.number().int().nonnegative(),
});

/** Outcome of a push: which connection, and per-entity counts of what was exported to its working copy. */
export const gitConnectionPushResultSchema = z.object({
	connectionId: z.string(),
	counts: gitConnectionExportCountsSchema,
});

export class GitConnectionPushResultDto extends Z.class(gitConnectionPushResultSchema.shape) {}

const count = () => z.number().int().nonnegative();

/**
 * Per-entity counts of what a pull changed in the instance, broken down by
 * outcome. Import overwrites the instance to match the working copy, so
 * `created` vs `updated` matters; a bare total would hide it. Kept to counts
 * (not per-entity lists) so the payload stays O(1) for a large working copy.
 */
export const gitConnectionImportCountsSchema = z.object({
	projects: z.object({ created: count(), updated: count(), skipped: count() }),
	folders: z.object({ created: count(), skipped: count() }),
	workflows: z.object({ created: count(), updated: count(), skipped: count() }),
	credentials: z.object({ matched: count(), stubbed: count() }),
	variables: z.object({
		matched: count(),
		created: count(),
		updated: count(),
		stubbed: count(),
		missing: count(),
	}),
	tags: z.object({
		matched: count(),
		created: count(),
		renamed: count(),
		reconciled: count(),
		skipped: count(),
	}),
});

/** Outcome of a pull: which connection, and per-entity counts of what was imported into the instance. */
export const gitConnectionPullResultSchema = z.object({
	connectionId: z.string(),
	counts: gitConnectionImportCountsSchema,
});

export class GitConnectionPullResultDto extends Z.class(gitConnectionPullResultSchema.shape) {}

export const gitConnectionSummarySchema = gitConnectionPublicSchema.omit({ publicKey: true });

export class GitConnectionListPublicDto extends Z.class({
	data: z.array(gitConnectionSummarySchema),
	nextCursor: z.string().nullable(),
}) {}

export const gitConnectionProjectPublicSchema = z.object({
	projectId: z.string(),
	gitConnectionId: z.string(),
});

export class GitConnectionProjectPublicDto extends Z.class(
	gitConnectionProjectPublicSchema.shape,
) {}

export class GitConnectionProjectListPublicDto extends Z.class({
	projectIds: z.array(z.string()),
}) {}
