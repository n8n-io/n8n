import { z } from 'zod';

import { Z } from '../../zod-class';

const oauthClientOwnerShape = z.object({
	id: z.string(),
	firstName: z.string().nullable(),
	lastName: z.string().nullable(),
	email: z.string(),
});

const oauthClientShape = {
	id: z.string(),
	name: z.string(),
	redirectUris: z.array(z.string()),
	grantTypes: z.array(z.string()),
	tokenEndpointAuthMethod: z.string(),
	createdAt: z.string().datetime(), // Using string for date serialization over HTTP
	updatedAt: z.string().datetime(),
	/** Unix ms when the user granted access on the consent screen. */
	grantedAt: z.number(),
	/** Scopes granted on the consent screen. */
	scopes: z.array(z.string()),
	/** Consent owner; present only when listing with ownership=all. */
	owner: oauthClientOwnerShape.optional(),
};

/**
 * DTO for OAuth client response (excludes sensitive data like clientSecret)
 */
export class OAuthClientResponseDto extends Z.class(oauthClientShape) {}

/**
 * DTO for the OAuth clients list query
 */
export class ListOAuthClientsQueryDto extends Z.class({
	/** 'all' requires mcp:manage; defaults to 'mine'. */
	ownership: z.enum(['mine', 'all']).optional(),
}) {}

/**
 * DTO for listing OAuth clients response
 */
export class ListOAuthClientsResponseDto extends Z.class({
	data: z.array(z.object(oauthClientShape)),
	count: z.number(),
	/** Tool names each grantable scope unlocks on this instance, for the client details view. */
	scopeTools: z.record(z.array(z.string())).optional(),
	/** Unfiltered per-ownership totals for the tab badges. `all` only for mcp:manage callers. */
	totals: z.object({ mine: z.number(), all: z.number().optional() }),
}) {}

/**
 * DTO for the OAuth client delete query
 */
export class DeleteOAuthClientQueryDto extends Z.class({
	/** Consent owner whose grant to revoke; defaults to the caller. Other users require mcp:manage. */
	userId: z.string().max(36).optional(),
}) {}

/**
 * DTO for deleting an OAuth client response
 */
export class DeleteOAuthClientResponseDto extends Z.class({
	success: z.boolean(),
	message: z.string(),
}) {}

/**
 * DTO for instance-wide MCP OAuth client capacity stats (admin-only)
 */
export class InstanceMcpClientStatsResponseDto extends Z.class({
	count: z.number(),
	limit: z.number(),
	atCapacity: z.boolean(),
}) {}
