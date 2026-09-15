import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

const customRoleProps = {
	user_id: z.string().describe('The user who made the change'),
	role_slug: z.string().describe('Slug of the custom role, e.g. `project:my-role-abc123`'),
};

const scopes = z.array(z.string()).describe('The scopes the role grants after the change');

export const ROLES_TELEMETRY = defineTelemetryEvents({
	USER_CREATED_CUSTOM_ROLE: {
		name: 'User created custom role',
		description: 'An admin created a custom project role.',
		properties: z.object({ ...customRoleProps, scopes }),
	},
	USER_UPDATED_CUSTOM_ROLE: {
		name: 'User updated custom role',
		description:
			'An admin changed a custom project role. The scopes property carries the full scope list after the update, not the diff.',
		properties: z.object({ ...customRoleProps, scopes }),
	},
	USER_DELETED_CUSTOM_ROLE: {
		name: 'User deleted custom role',
		description: 'An admin deleted a custom project role.',
		properties: z.object(customRoleProps),
	},
	USER_UPDATED_PERSONAL_SPACE_ROLE: {
		name: 'User updated personal space role',
		description:
			'An admin changed the scopes of the personal space role, which every user holds in their own personal project. Only possible in canvas-only mode, and only for the scopes that role lets an admin remove.',
		properties: z.object({}),
	},
});
