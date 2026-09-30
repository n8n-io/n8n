import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import type { Workspace } from '@n8n/agents';

import type { InstanceAiContext } from '../types';

const warmedWorkspaces = new WeakSet<Workspace>();

/**
 * Start to provision the runtime workspace in the background. Discovery comes before the
 * first build, so the build does not wait for the sandbox. Only the first call for a
 * workspace starts it; a failure is logged and the build tries again.
 */
export function warmWorkspace(context: Pick<InstanceAiContext, 'workspace' | 'logger'>): void {
	const { workspace } = context;
	if (!workspace || warmedWorkspaces.has(workspace)) return;
	warmedWorkspaces.add(workspace);
	void getWorkspaceRoot(workspace).catch((error: unknown) => {
		context.logger.debug('Workspace warm-up failed', {
			error: error instanceof Error ? error.message : String(error),
		});
	});
}
