import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import {
	type ProjectMutationHooks,
	ProjectMutationHooksProxy,
} from '../project-mutation-hooks-proxy.service';

describe('ProjectMutationHooksProxy', () => {
	test('is a no-op when no provider is registered', async () => {
		const proxy = new ProjectMutationHooksProxy(mock<Logger>());

		await expect(proxy.afterTeamProjectCreated('project-1')).resolves.toBeUndefined();
	});

	test('calls the next provider when one fails', async () => {
		const logger = mock<Logger>();
		const proxy = new ProjectMutationHooksProxy(logger);
		const failing = mock<ProjectMutationHooks>();
		const failure = new Error('limits are down');
		failing.afterTeamProjectCreated.mockRejectedValue(failure);
		const next = mock<ProjectMutationHooks>();
		proxy.registerProvider(failing);
		proxy.registerProvider(next);

		await proxy.afterTeamProjectCreated('project-1');

		expect(next.afterTeamProjectCreated).toHaveBeenCalledExactlyOnceWith('project-1');
		expect(logger.error).toHaveBeenCalledWith('Project mutation hook failed', {
			hook: 'afterTeamProjectCreated',
			projectId: 'project-1',
			error: failure,
		});
	});
});
