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

	describe('beforeProjectDeleted', () => {
		const deletion = { projectId: 'project-1', userId: 'user-1', loginId: 'login-1' };
		const ctx = {};

		test('is a no-op when no provider is registered', async () => {
			const proxy = new ProjectMutationHooksProxy(mock<Logger>());

			const afterProjectDeleted = await proxy.beforeProjectDeleted(deletion, ctx);

			await expect(afterProjectDeleted()).resolves.toBeUndefined();
		});

		test('skips a provider that has no deletion hook', async () => {
			const proxy = new ProjectMutationHooksProxy(mock<Logger>());
			const next = mock<ProjectMutationHooks>();
			proxy.registerProvider({ afterTeamProjectCreated: vi.fn() });
			proxy.registerProvider(next);

			await proxy.beforeProjectDeleted(deletion, ctx);

			expect(next.beforeProjectDeleted).toHaveBeenCalledExactlyOnceWith(deletion, ctx);
		});

		test('rejects when a provider fails, so the delete rolls back', async () => {
			const proxy = new ProjectMutationHooksProxy(mock<Logger>());
			const failing = mock<ProjectMutationHooks>();
			failing.beforeProjectDeleted.mockRejectedValue(new Error('limits are down'));
			proxy.registerProvider(failing);

			await expect(proxy.beforeProjectDeleted(deletion, ctx)).rejects.toThrow('limits are down');
		});

		test('runs the next callback when one fails after the commit', async () => {
			const logger = mock<Logger>();
			const proxy = new ProjectMutationHooksProxy(logger);
			const failure = new Error('reload failed');
			const nextCallback = vi.fn();
			proxy.registerProvider({
				beforeProjectDeleted: async () => vi.fn().mockRejectedValue(failure),
			});
			proxy.registerProvider({ beforeProjectDeleted: async () => nextCallback });

			const afterProjectDeleted = await proxy.beforeProjectDeleted(deletion, ctx);
			expect(nextCallback).not.toHaveBeenCalled();
			await afterProjectDeleted();

			expect(nextCallback).toHaveBeenCalledOnce();
			expect(logger.error).toHaveBeenCalledWith('Project mutation hook failed', {
				hook: 'afterProjectDeleted',
				projectId: 'project-1',
				error: failure,
			});
		});
	});
});
