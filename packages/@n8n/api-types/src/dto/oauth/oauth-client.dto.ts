import { z } from 'zod';

import {
	MAX_OAUTH_REDIRECT_URI_LENGTH,
	MAX_OAUTH_REDIRECT_URIS,
	MCP_CLIENT_CONNECTED_PERIODS,
	MCP_CLIENT_TYPE_FILTERS,
	MCP_OAUTH_CLIENT_REGISTRATIONS,
} from '../../schemas/mcp.schema';
import { Z } from '../../zod-class';
import { paginationSchema } from '../pagination/pagination.dto';

const oauthClientOwnerShape = z.object({
	id: z.string(),
	firstName: z.string().nullable(),
	lastName: z.string().nullable(),
	email: z.string(),
});

/** The registration itself, without any user's grant on it. */
const oauthClientRegistrationShape = {
	id: z.string(),
	name: z.string(),
	redirectUris: z.array(z.string()),
	grantTypes: z.array(z.string()),
	tokenEndpointAuthMethod: z.string(),
	createdAt: z.string().datetime(), // Using string for date serialization over HTTP
	updatedAt: z.string().datetime(),
	/** How the client registration came to exist. */
	registration: z.enum(MCP_OAUTH_CLIENT_REGISTRATIONS),
};

const oauthClientShape = {
	...oauthClientRegistrationShape,
	/**
	 * Unix ms when the user granted access on the consent screen. `null` for a
	 * manually registered client the user has not connected with yet.
	 */
	grantedAt: z.number().nullable(),
	/** Scopes granted on the consent screen. */
	scopes: z.array(z.string()),
	/**
	 * Consent owner, or the creator for a manual client that has no consent yet.
	 * Present only when listing with ownership=all.
	 */
	owner: oauthClientOwnerShape.optional(),
	/** Whether the caller may edit or delete this registration. */
	canManage: z.boolean().optional(),
};

/**
 * A manually registered client's redirect URI is supplied by the user, so it is
 * validated here rather than trusted: https anywhere, http only on loopback
 * (RFC 8252 §7.3 — native clients bind an ephemeral loopback port).
 */
const redirectUriSchema = z
	.string()
	.trim()
	.min(1)
	.max(MAX_OAUTH_REDIRECT_URI_LENGTH)
	.superRefine((value, ctx) => {
		let url: URL;
		try {
			url = new URL(value);
		} catch {
			ctx.addIssue({ code: 'custom', message: `${value} is not a valid URL` });
			return;
		}

		if (url.protocol !== 'http:' && url.protocol !== 'https:') {
			ctx.addIssue({ code: 'custom', message: `${value} must use http or https` });
			return;
		}

		const isLoopback =
			url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
		if (url.protocol === 'http:' && !isLoopback) {
			ctx.addIssue({ code: 'custom', message: `${value} must use https` });
		}
	});

const manualClientShape = {
	name: z.string().trim().min(1).max(100),
	redirectUris: z.array(redirectUriSchema).min(1).max(MAX_OAUTH_REDIRECT_URIS),
};

/**
 * DTO for manually pre-registering an OAuth client (for MCP clients that don't
 * implement Dynamic Client Registration).
 */
export class CreateOAuthClientRequestDto extends Z.class({
	...manualClientShape,
	/**
	 * Issue a client secret, for a client that can keep one (a server-side
	 * connector). Public clients are authenticated by PKCE and need no secret.
	 */
	confidential: z.boolean().optional(),
}) {}

/** DTO for editing a manually registered OAuth client. */
export class UpdateOAuthClientRequestDto extends Z.class(manualClientShape) {}

/**
 * DTO for a manually registered client on its own, i.e. before anyone has
 * consented to it. Grants are reported by the clients list, not here.
 */
export class ManualOAuthClientResponseDto extends Z.class(oauthClientRegistrationShape) {}

/**
 * DTO returned right after a manual registration. Carries the generated secret
 * for a confidential client, which is the only time it is ever readable.
 */
export class CreateOAuthClientResponseDto extends Z.class({
	...oauthClientRegistrationShape,
	clientSecret: z.string().optional(),
}) {}

/** DTO for a freshly rotated client secret, readable only in this response. */
export class RotateOAuthClientSecretResponseDto extends Z.class({
	clientSecret: z.string(),
}) {}

/**
 * DTO for OAuth client response (excludes sensitive data like clientSecret)
 */
export class OAuthClientResponseDto extends Z.class(oauthClientShape) {}

/**
 * DTO for the OAuth clients list query
 */
export class ListOAuthClientsQueryDto extends Z.class({
	...paginationSchema,
	/** 'all' requires mcp:manage; defaults to 'mine'. */
	ownership: z.enum(['mine', 'all']).optional(),
	/** Case-insensitive substring match against the client's name. */
	name: z.string().trim().min(1).max(100).optional(),
	/** Narrow the `all` view to consents of this user. Ignored without mcp:manage. */
	ownerId: z.string().max(36).optional(),
	/** Client type bucket, resolved from the client name via the shared brand matchers. */
	type: z.enum(MCP_CLIENT_TYPE_FILTERS).optional(),
	/** Date bucket applied to the consent's grantedAt. */
	connected: z.enum(MCP_CLIENT_CONNECTED_PERIODS).optional(),
}) {}

/**
 * DTO for listing OAuth clients response
 */
export class ListOAuthClientsResponseDto extends Z.class({
	data: z.array(z.object(oauthClientShape)),
	/** Total rows matching the filters (across all pages) for the current ownership. */
	count: z.number(),
	/** Tool names each grantable scope unlocks on this instance, for the client details view. */
	scopeTools: z.record(z.array(z.string())).optional(),
	/** Unfiltered per-ownership totals for the tab badges. `all` only for mcp:manage callers. */
	totals: z.object({ mine: z.number(), all: z.number().optional() }),
	/** Distinct consent owners for the "Connected by" filter; only for mcp:manage callers. */
	owners: z.array(oauthClientOwnerShape).optional(),
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
