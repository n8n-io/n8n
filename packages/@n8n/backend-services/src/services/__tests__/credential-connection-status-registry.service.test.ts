import { CredentialConnectionStatusRegistry } from '../credential-connection-status-registry.service';

describe('CredentialConnectionStatusRegistry', () => {
	it('delegates cleanup to the registered handler', async () => {
		const cleanup = vi.fn().mockResolvedValue(undefined);
		const registry = new CredentialConnectionStatusRegistry();
		registry.registerCleanup(cleanup);

		await registry.cleanupOrphanedEntriesForUsers(['user-1']);

		expect(cleanup).toHaveBeenCalledWith(['user-1']);
	});

	it('does nothing when no handler is registered', async () => {
		const registry = new CredentialConnectionStatusRegistry();

		await expect(registry.cleanupOrphanedEntriesForUsers(['user-1'])).resolves.toBeUndefined();
	});
});
