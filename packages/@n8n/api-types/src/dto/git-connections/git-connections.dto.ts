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

export class ConnectGitConnectionDto extends Z.class({
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

export const gitConnectionSummarySchema = gitConnectionPublicSchema.omit({ publicKey: true });

export class GitConnectionListPublicDto extends Z.class({
	data: z.array(gitConnectionSummarySchema),
	nextCursor: z.string().nullable(),
}) {}
