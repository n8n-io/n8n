import type { LocalAuthorizationServer } from '@n8n/inbound-auth';
import { OperationalError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { LocalAuthorizationServerProxy } from '../local-authorization-server.proxy';

describe('LocalAuthorizationServerProxy', () => {
	let proxy: LocalAuthorizationServerProxy;

	beforeEach(() => {
		proxy = new LocalAuthorizationServerProxy();
	});

	it('rejects every read and reports no token active until a server registers', async () => {
		await expect(proxy.getMetadata()).rejects.toThrow(OperationalError);
		await expect(proxy.getJwks()).rejects.toThrow(OperationalError);
		await expect(proxy.isAccessTokenActive('token')).resolves.toBe(false);
	});

	it('forwards to the registered server', async () => {
		const server = mock<LocalAuthorizationServer>();
		server.getMetadata.mockResolvedValue({ issuer: 'https://n8n.example' });
		server.getJwks.mockResolvedValue({ keys: [] });
		server.isAccessTokenActive.mockResolvedValue(true);
		await proxy.registerProvider(server);

		await expect(proxy.getMetadata()).resolves.toEqual({ issuer: 'https://n8n.example' });
		await expect(proxy.getJwks()).resolves.toEqual({ keys: [] });
		await expect(proxy.isAccessTokenActive('token')).resolves.toBe(true);
		expect(server.isAccessTokenActive).toHaveBeenCalledWith('token');
	});

	it('runs a listener once a server registers, and at once when one already has', async () => {
		const before = vi.fn().mockResolvedValue(undefined);
		const after = vi.fn().mockResolvedValue(undefined);

		await proxy.onProviderRegistered(before);
		expect(before).not.toHaveBeenCalled();

		await proxy.registerProvider(mock<LocalAuthorizationServer>());
		expect(before).toHaveBeenCalledTimes(1);

		await proxy.onProviderRegistered(after);
		expect(after).toHaveBeenCalledTimes(1);
	});
});
