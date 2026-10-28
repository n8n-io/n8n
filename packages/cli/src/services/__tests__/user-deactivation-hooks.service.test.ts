import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import { createDeferredPromise } from 'n8n-workflow';

import { UserDeactivationHooks } from '../user-deactivation-hooks.service';

describe('UserDeactivationHooks', () => {
	it('does nothing when no module has registered a hook', async () => {
		await expect(
			new UserDeactivationHooks().run('user-id', mock<EntityManager>()),
		).resolves.toBeUndefined();
	});

	it('awaits hooks and passes the caller context unchanged', async () => {
		const hooks = new UserDeactivationHooks();
		const ctx = mock<EntityManager>();
		const release = createDeferredPromise();
		const first = jest.fn(async (_userId: string, _ctx: EntityManager) => await release.promise);
		const second = jest.fn(async () => {});
		hooks.register('first', first);
		hooks.register('second', second);

		const running = hooks.run('user-id', ctx);
		expect(first).toHaveBeenCalledWith('user-id', ctx);
		expect(first.mock.calls[0][1]).toBe(ctx);
		expect(second).not.toHaveBeenCalled();
		release.resolve();
		await running;
		expect(second).toHaveBeenCalledWith('user-id', ctx);
	});

	it('propagates cleanup failures to the deactivation transaction', async () => {
		const hooks = new UserDeactivationHooks();
		const error = new Error('Cleanup failed');
		hooks.register('failing', async () => {
			throw error;
		});
		await expect(hooks.run('user-id', mock<EntityManager>())).rejects.toBe(error);
	});
});
