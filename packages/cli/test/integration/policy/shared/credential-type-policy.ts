import type { PolicyAction, PolicyRule } from '@n8n/api-types';

import type { SuperAgentTest } from '../../shared/types';

/**
 * Writes a credential type policy over the same routes an admin uses. The suites here judge
 * what the check decides, not the write path, but going through HTTP means a route wired to
 * the wrong kind shows up as a failing enforcement case rather than passing quietly.
 */
export async function putCredentialTypePolicy(
	agent: SuperAgentTest,
	projectId: string | null,
	{
		rules,
		defaultAction = 'allow',
		version = 0,
	}: { rules: PolicyRule[]; defaultAction?: PolicyAction; version?: number },
) {
	const path =
		projectId === null
			? '/credential-type-policies/instance'
			: `/projects/${projectId}/credential-type-policies/project`;

	const response = await agent.put(path).send({ rules, defaultAction, version });

	if (response.statusCode !== 200) {
		throw new Error(
			`Could not write the policy: ${response.statusCode} ${JSON.stringify(response.body)}`,
		);
	}

	return response.body as { version: number };
}

export const denyRule = (id: string, credentialType: string): PolicyRule => ({
	id,
	action: 'deny',
	selector: { kind: 'name', value: credentialType },
});
