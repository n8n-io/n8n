import type { User } from '@n8n/db';

import { userHasScopes } from '@/permissions.ee/check-access';

import type { SystemAgentProvider } from './system-agent.types';

/**
 * Whether the user can use a system agent in a working project. The runtime
 * floor applies to every system agent: the user must be able to read the
 * working project, because the agent acts in it with the user's permissions.
 * The floor uses `project:read`, not `agent:execute`: `agent:execute` gates
 * the custom agents of a project. The provider then adds its own checks.
 * Thread ownership is checked where the thread is loaded.
 */
export async function canUseSystemAgent(
	provider: SystemAgentProvider,
	user: User,
	projectId: string,
): Promise<boolean> {
	if (!(await userHasScopes(user, ['project:read'], false, { projectId }))) return false;
	return await provider.authorize(user, projectId);
}
