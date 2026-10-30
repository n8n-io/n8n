import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

/** How a source is configured, as enums only: no issuer, endpoints or client credentials. */
const configFacets = {
	discovery_mode: z
		.enum(['auto', 'manual'])
		.describe(
			"'auto' resolves the issuer's well-known documents; 'manual' uses admin-entered URLs",
		),
	client_kind: z
		.enum(['registered', 'virtual'])
		.nullable()
		.describe('Null when the source has no OAuth2 client configured'),
	// Keep in sync with `SurfaceIdSchema` in @n8n/inbound-auth; the typed `track` call fails otherwise.
	surfaces: z
		.array(z.enum(['public-api', 'instance-mcp', 'trigger', 'apps']))
		.describe('The surfaces the source may authenticate on'),
	identity_subject: z
		.enum(['n8n-user-id', 'binding'])
		.describe(
			"'binding' maps the token subject to a user through a stored binding; 'n8n-user-id' takes the subject as the user id",
		),
	link_by_email: z
		.enum(['off', 'verified-only', 'any'])
		.describe('Whether an unbound subject may be linked to an existing user by email claim'),
	provision_human: z
		.enum(['off', 'jit'])
		.describe("'jit' creates a user on first authentication when no binding or email match exists"),
	role_mapping_mode: z
		.enum(['off', 'on-provision', 'continuous'])
		.describe(
			"'on-provision' assigns roles from claims once at user creation; 'continuous' re-evaluates them on every authentication",
		),
};

export const TRUSTED_SOURCES_TELEMETRY = defineTelemetryEvents({
	USER_CREATED_TRUSTED_SOURCE: {
		name: 'User created trusted source',
		description:
			'An admin created a trusted source through the REST API. Only admin-managed sources report; the seeded system source does not.',
		properties: z.object({
			user_id: z.string(),
			source_id: z.string(),
			...configFacets,
		}),
	},
	USER_UPDATED_TRUSTED_SOURCE: {
		name: 'User updated trusted source',
		description:
			'An admin changed the name, issuer, config or bindings of a trusted source through the REST API. The facets describe the config after the change. An empty patch does not report.',
		properties: z.object({
			user_id: z.string(),
			source_id: z.string(),
			...configFacets,
		}),
	},
	USER_DELETED_TRUSTED_SOURCE: {
		name: 'User deleted trusted source',
		description: 'An admin deleted a trusted source through the REST API.',
		properties: z.object({
			user_id: z.string(),
			source_id: z.string(),
		}),
	},
	TRUSTED_SOURCE_AUTHENTICATED_FIRST_REQUEST: {
		name: 'Trusted source authenticated first request',
		description:
			'An admin-managed trusted source verified a token and resolved a user for the first time since it was created. Fires once per source, from the instance that handled the request. The seeded system source does not report.',
		properties: z.object({
			source_id: z.string(),
			surface: z
				.enum(['public-api', 'instance-mcp', 'trigger', 'apps'])
				.describe('The surface the first authenticated request arrived on'),
		}),
	},
	TRUSTED_SOURCE_BECAME_HEALTHY: {
		name: 'Trusted source became healthy',
		description:
			'Discovery fetched every document an admin-managed trusted source needs, and the source was not healthy before. Fires on the first successful discovery, on every recovery from an error, and after an admin changes the issuer or config, which resets the source. The seeded system source does not report.',
		properties: z.object({
			source_id: z.string(),
		}),
	},
});
