import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

export const ROLES_TELEMETRY = defineTelemetryEvents({
	USER_UPDATED_PERSONAL_SPACE_ROLE: {
		name: 'User updated personal space role',
		description:
			'An admin changed the scopes of the personal space role, which every user holds in their own personal project. Only possible in canvas-only mode, and only for the scopes that role lets an admin remove. Changes to a custom role report as "User updated custom role" instead.',
		properties: z.object({
			user_id: z.string(),
			scopes: z.array(z.string()).describe('The scopes the role grants after the change'),
			removed_scopes: z
				.array(z.string())
				.describe(
					'The removable scopes the role no longer grants. Empty when the admin added them all back',
				),
		}),
	},
});
