import { z } from 'zod';
import { Z } from 'zod-class';

/**
 * DTO for OAuth client response (excludes sensitive data like clientSecret)
 */
export class OAuthClientResponseDto extends Z.class({
	id: z.string(),
	name: z.string(),
	redirectUris: z.array(z.string()),
	grantTypes: z.array(z.string()),
	tokenEndpointAuthMethod: z.string(),
	scopes: z.string(),
	createdAt: z.date(),
	updatedAt: z.date(),
}) {}

/**
 * DTO for listing OAuth clients response
 * Reuses the OAuthClientResponseDto schema for the data array
 */
export class ListOAuthClientsResponseDto extends Z.class({
	data: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			redirectUris: z.array(z.string()),
			grantTypes: z.array(z.string()),
			tokenEndpointAuthMethod: z.string(),
			scopes: z.string(),
			createdAt: z.date(),
			updatedAt: z.date(),
		}),
	),
	count: z.number(),
}) {}
