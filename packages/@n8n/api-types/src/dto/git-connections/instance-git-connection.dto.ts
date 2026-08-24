import { z } from 'zod';

import {
	gitConnectionPublicSchema,
	gitConnectionTypeSchema,
	gitConnectionUpdatableFieldsShape,
} from './git-connections.dto';
import { Z } from '../../zod-class';

/** Partial patch for the singleton instance Git connection; `enabled` in place of a `name`. */
export class UpdateInstanceGitConnectionDto extends Z.class({
	enabled: z.boolean().optional(),
	...gitConnectionUpdatableFieldsShape,
}) {}

/**
 * Like {@link gitConnectionPublicSchema} without `id`/`name` and with `enabled`.
 * All fields are nullable: the connection is readable before being configured.
 */
export const instanceGitConnectionPublicSchema = gitConnectionPublicSchema
	.omit({ id: true, name: true })
	.extend({
		enabled: z.boolean(),
		repositoryUrl: z.string().nullable(),
		connectionType: gitConnectionTypeSchema.nullable(),
		createdAt: z.string().datetime().nullable(),
		updatedAt: z.string().datetime().nullable(),
	});

export class InstanceGitConnectionPublicDto extends Z.class(
	instanceGitConnectionPublicSchema.shape,
) {}
