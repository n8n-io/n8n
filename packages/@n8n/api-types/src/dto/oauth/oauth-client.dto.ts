import { z } from 'zod';

import { Z } from '../../zod-class';

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
	/** Scopes granted on the consent screen. NULL = consent predates scoping (full access). */
	scopes: z.array(z.string()).nullable(),
	/** Unix ms of the last authenticated request from this client. NULL = no activity recorded. */
	lastActiveAt: z.number().nullable(),
};

/**
 * DTO for OAuth client response (excludes sensitive data like clientSecret)
 */
export class OAuthClientResponseDto extends Z.class(oauthClientShape) {}

/**
 * DTO for listing OAuth clients response
 */
export class ListOAuthClientsResponseDto extends Z.class({
	data: z.array(z.object(oauthClientShape)),
	count: z.number(),
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
