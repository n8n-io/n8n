import type { ModuleRegistry } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { OAuthTokenService } from '@/modules/oauth-server/oauth-token.service';

import { RefreshTokenAdapter } from '../refresh-token.adapter';

// The adapter loads the OAuth server service only when it needs it. A stub keeps this test small.
vi.mock('@/modules/oauth-server/oauth-token.service', () => ({
	OAuthTokenService: class {},
}));

const resource = 'https://n8n.example.com/mcp-servers/acme';

function setup({ moduleActive }: { moduleActive: boolean }) {
	const moduleRegistry = mock<ModuleRegistry>();
	moduleRegistry.isActive.mockImplementation((name) => moduleActive && name === 'oauth-server');
	const tokens = mock<OAuthTokenService>();
	tokens.revokeRefreshTokensForResource.mockResolvedValue(3);
	Container.set(OAuthTokenService, tokens);
	return { tokens, adapter: new RefreshTokenAdapter(moduleRegistry) };
}

describe('RefreshTokenAdapter', () => {
	it('deletes the tokens of one person for the server', async () => {
		const { adapter, tokens } = setup({ moduleActive: true });

		await expect(adapter.deleteForPerson(resource, 'user-1')).resolves.toBe(3);

		expect(tokens.revokeRefreshTokensForResource).toHaveBeenCalledWith(resource, 'user-1');
	});

	it('deletes the tokens of all people for the server', async () => {
		const { adapter, tokens } = setup({ moduleActive: true });

		await expect(adapter.deleteForResource(resource)).resolves.toBe(3);

		expect(tokens.revokeRefreshTokensForResource).toHaveBeenCalledWith(resource, undefined);
	});

	it('deletes nothing when the OAuth server module is off', async () => {
		const { adapter, tokens } = setup({ moduleActive: false });

		await expect(adapter.deleteForPerson(resource, 'user-1')).resolves.toBe(0);
		await expect(adapter.deleteForResource(resource)).resolves.toBe(0);

		expect(tokens.revokeRefreshTokensForResource).not.toHaveBeenCalled();
	});
});
