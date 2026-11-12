import { UnexpectedError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import {
	AgentProjectLookupProxy,
	type AgentProjectLookup,
} from '../agent-project-lookup-proxy.service';

describe('AgentProjectLookupProxy', () => {
	it('throws when no provider is registered', async () => {
		const proxy = new AgentProjectLookupProxy();

		await expect(proxy.getProjectIdById('agent-1')).rejects.toThrow(UnexpectedError);
	});

	it('delegates to the registered provider', async () => {
		const proxy = new AgentProjectLookupProxy();
		const provider = mock<AgentProjectLookup>();
		provider.getProjectIdById.mockResolvedValue('project-1');
		proxy.registerProvider(provider);

		await expect(proxy.getProjectIdById('agent-1')).resolves.toBe('project-1');
		expect(provider.getProjectIdById).toHaveBeenCalledWith('agent-1');
	});

	it('returns null when the provider finds no agent', async () => {
		const proxy = new AgentProjectLookupProxy();
		const provider = mock<AgentProjectLookup>();
		provider.getProjectIdById.mockResolvedValue(null);
		proxy.registerProvider(provider);

		await expect(proxy.getProjectIdById('agent-1')).resolves.toBeNull();
	});
});
