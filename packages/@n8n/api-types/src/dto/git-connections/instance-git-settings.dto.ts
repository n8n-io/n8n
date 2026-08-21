import { z } from 'zod';

import {
	branchNameSchema,
	gitConnectionTypeSchema,
	gitKeyGeneratorTypeSchema,
	repositoryUrlSchema,
} from './git-connections.dto';
import { Z } from '../../zod-class';

/**
 * Partial patch for the singleton instance Git connection settings. Every field
 * is optional; the service rejects an empty body and enforces that enabling
 * requires a fully configured connection.
 */
export class UpdateInstanceGitSettingsDto extends Z.class({
	enabled: z.boolean().optional(),
	repositoryUrl: repositoryUrlSchema.optional(),
	branchName: branchNameSchema.optional(),
	connectionType: gitConnectionTypeSchema.optional(),
	keyGeneratorType: gitKeyGeneratorTypeSchema.optional(),
	username: z.string().min(1).optional(),
	password: z.string().min(1).optional(),
}) {}

export const instanceGitSettingsPublicSchema = z.object({
	enabled: z.boolean(),
	// Fields are nullable because the settings are readable before ever being
	// configured (they default to a disabled, empty connection).
	repositoryUrl: z.string().nullable(),
	branchName: z.string().nullable(),
	connectionType: gitConnectionTypeSchema.nullable(),
	publicKey: z.string().nullable(),
	keyGeneratorType: gitKeyGeneratorTypeSchema.nullable(),
	baseCommit: z.string().nullable(),
	createdAt: z.string().datetime().nullable(),
	updatedAt: z.string().datetime().nullable(),
});

export class InstanceGitSettingsPublicDto extends Z.class(instanceGitSettingsPublicSchema.shape) {}
