import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * DTO for OAuth client response (excludes sensitive data like clientSecret)
 */
export class OAuthClientResponseDto extends Z.class({
	id: z.string(),
	name: z.string(),
	redirectUris: z.array(z.string()),
	grantTypes: z.array(z.string()),
	tokenEndpointAuthMethod: z.string(),
	createdAt: z.iso.datetime(), // Using string for date serialization over HTTP
	updatedAt: z.iso.datetime(),
}) {}

/**
 * DTO for listing OAuth clients response
 */
export class ListOAuthClientsResponseDto extends Z.class({
	data: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			redirectUris: z.array(z.string()),
			grantTypes: z.array(z.string()),
			tokenEndpointAuthMethod: z.string(),
			createdAt: z.iso.datetime(),
			updatedAt: z.iso.datetime(),
		}),
	),
	count: z.number(),
}) {}

/**
 * DTO for deleting an OAuth client response
 */
export class DeleteOAuthClientResponseDto extends Z.class({
	success: z.boolean(),
	message: z.string(),
}) {}
