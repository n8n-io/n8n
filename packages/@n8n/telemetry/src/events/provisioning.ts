import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

export const PROVISIONING_TELEMETRY = defineTelemetryEvents({
	USER_UPDATED_PROVISIONING_SETTINGS: {
		name: 'User updated provisioning settings',
		description:
			'An admin saved the SSO user role provisioning settings: which roles SSO provisions and how the claims map to them. The instance reports each save from the settings endpoint with the user and the state after the save, also when the request changed nothing. The settings page in the browser reports the same save once more, after it has also saved the mapping rules, and only when something changed.',
		properties: z.object({
			user_id: z.string().optional().describe('Absent when the browser reports the save'),
			authentication_method: z
				.enum(['saml', 'oidc', 'ldap', 'email', 'token-exchange'])
				.describe(
					'From the instance: the sign-in method that is active at the time of the save, `email` when single sign-on is off. From the browser: the SSO tab that the admin saved on, `saml` or `oidc`',
				),
			assignment_method: z
				.enum(['disabled', 'instance_role', 'instance_and_project_roles'])
				.describe(
					'Which roles SSO provisions after the save. With rules in n8n, the instance reports `instance_and_project_roles` when project rules existed at the time of the save; the settings page saves the rules after the settings, so a first setup reports `instance_role` from the instance and `instance_and_project_roles` from the browser',
				),
			role_mapping_method: z
				.enum(['idp_rule_mapping', 'n8n_rule_mapping'])
				.describe(
					'`idp_rule_mapping`: the claims of the identity provider carry the roles. `n8n_rule_mapping`: rules in n8n map the claims to roles',
				),
			instance_rule_count: z
				.number()
				.describe(
					'Instance role mapping rules that exist after the save. From the browser: after the rules were saved too',
				),
			project_rule_count: z
				.number()
				.describe(
					'Project role mapping rules that exist after the save. A switch away from project roles deletes them in the same save. From the browser: after the rules were saved too',
				),
			instance_id: z
				.string()
				.optional()
				.describe('Browser only; the instance adds its own id to every event it sends'),
		}),
	},
});
