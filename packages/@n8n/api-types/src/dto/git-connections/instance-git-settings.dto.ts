import { z } from 'zod';

import {
	gitConnectionPublicSchema,
	gitConnectionTypeSchema,
	gitConnectionUpdatableFieldsShape,
} from './git-connections.dto';
import { Z } from '../../zod-class';

/** Partial patch for the singleton instance Git settings; `enabled` in place of a `name`. */
export class UpdateInstanceGitSettingsDto extends Z.class({
	enabled: z.boolean().optional(),
	...gitConnectionUpdatableFieldsShape,
}) {}

/**
 * Like {@link gitConnectionPublicSchema} without `id`/`name` and with `enabled`.
 * All fields are nullable: settings are readable before being configured.
 */
export const instanceGitSettingsPublicSchema = gitConnectionPublicSchema
	.omit({ id: true, name: true })
	.extend({
		enabled: z.boolean(),
		repositoryUrl: z.string().nullable(),
		connectionType: gitConnectionTypeSchema.nullable(),
		createdAt: z.string().datetime().nullable(),
		updatedAt: z.string().datetime().nullable(),
	});

export class InstanceGitSettingsPublicDto extends Z.class(instanceGitSettingsPublicSchema.shape) {}
