import { z } from 'zod';

import { Z } from '../../zod-class';

const cliSessionSchema = z.object({
	/** Token fingerprint (last 8 chars) used as stable identifier for revocation */
	id: z.string(),
	scopes: z.array(z.string()),
	createdAt: z.string().datetime(),
	/** When the current access token expires (short-lived, ~1 hour) */
	accessTokenExpiresAt: z.string().datetime(),
	/** When the refresh token expires (long-lived, ~30 days) */
	refreshTokenExpiresAt: z.string().datetime(),
	/** Device name provided by the CLI (e.g. hostname) */
	deviceName: z.string().nullable(),
	/** Operating system */
	os: z.string().nullable(),
	/** IP address of the client at authorization time */
	ip: z.string().nullable(),
});

export class CliSessionResponseDto extends Z.class(cliSessionSchema.shape) {}

export class ListCliSessionsResponseDto extends Z.class({
	data: z.array(cliSessionSchema),
	count: z.number(),
}) {}

export class DeleteCliSessionResponseDto extends Z.class({
	success: z.boolean(),
	message: z.string(),
}) {}
