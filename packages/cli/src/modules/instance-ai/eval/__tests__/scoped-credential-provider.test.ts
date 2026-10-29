import type { CredentialListItem, ResolvedCredential } from '@n8n/agents';

import { scopeCredentialProvider } from '../scoped-credential-provider';

const credentials: CredentialListItem[] = [
	{ id: 'cred-1', name: 'Gemini A', type: 'googlePalmApi' },
	{ id: 'cred-2', name: 'Gemini B', type: 'googlePalmApi' },
	{ id: 'cred-3', name: 'Slack', type: 'slackApi' },
];

const resolved = { id: 'cred-1', type: 'googlePalmApi', data: {} } as unknown as ResolvedCredential;

describe('scopeCredentialProvider', () => {
	it('lists only the allowlisted credentials', async () => {
		const provider = { resolve: vi.fn(), list: vi.fn().mockResolvedValue(credentials) };
		const scoped = scopeCredentialProvider(provider, () => ['cred-1', 'cred-3']);

		expect(await scoped.list()).toEqual([credentials[0], credentials[2]]);
	});

	it('resolves by id through the inner provider', async () => {
		const provider = { resolve: vi.fn().mockResolvedValue(resolved), list: vi.fn() };
		const scoped = scopeCredentialProvider(provider, () => ['cred-1']);

		expect(await scoped.resolve('cred-1')).toBe(resolved);
		expect(provider.resolve).toHaveBeenCalledWith('cred-1');
	});

	it('keeps the gateway resolver only when the inner provider has one', async () => {
		const gateway = vi.fn().mockResolvedValue(resolved);
		const withGateway = scopeCredentialProvider(
			{ resolve: vi.fn(), list: vi.fn(), resolveAiGatewayModelCredential: gateway },
			() => [],
		);
		const withoutGateway = scopeCredentialProvider({ resolve: vi.fn(), list: vi.fn() }, () => []);

		expect(await withGateway.resolveAiGatewayModelCredential?.('openai')).toBe(resolved);
		expect(gateway).toHaveBeenCalledWith('openai');
		expect(withoutGateway.resolveAiGatewayModelCredential).toBeUndefined();
	});

	it('reads the allowlist on every list call', async () => {
		const provider = { resolve: vi.fn(), list: vi.fn().mockResolvedValue(credentials) };
		let allowed = ['cred-1'];
		const scoped = scopeCredentialProvider(provider, () => allowed);

		expect(await scoped.list()).toEqual([credentials[0]]);
		allowed = ['cred-1', 'cred-2'];
		expect(await scoped.list()).toEqual([credentials[0], credentials[1]]);
	});

	it('leaves the list unscoped while no allowlist is set', async () => {
		const provider = { resolve: vi.fn(), list: vi.fn().mockResolvedValue(credentials) };
		const scoped = scopeCredentialProvider(provider, () => undefined);

		expect(await scoped.list()).toEqual(credentials);
	});
});
