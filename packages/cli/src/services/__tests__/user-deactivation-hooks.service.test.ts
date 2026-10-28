import type { OperationContext } from '@n8n/db';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';

import { UserDeactivationHooks } from '../user-deactivation-hooks.service';

describe('UserDeactivationHooks', () => {
	it('does nothing when no module has registered a hook', async () => {
		await expect(new UserDeactivationHooks().run('user-id', {})).resolves.toBeUndefined();
	});

	it('awaits hooks and passes the caller context unchanged', async () => {
		const hooks = new UserDeactivationHooks();
		const ctx: OperationContext = {};
		const release = createDeferredPromise();
		const first = vi.fn(async (_userId: string, _ctx: OperationContext) => await release.promise);
		const second = vi.fn(async () => {});
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
		await expect(hooks.run('user-id', {})).rejects.toBe(error);
	});
});
