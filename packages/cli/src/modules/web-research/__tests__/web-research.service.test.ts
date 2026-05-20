import type { SsrfProtectionService } from '@/services/ssrf/ssrf-protection.service';

import { WebResearchService } from '../web-research.service';

describe('WebResearchService', () => {
	it('reuses an in-flight lazy backend resolution across concurrent searches', async () => {
		let resolveBackendLookup: () => void;
		const backendLookup = new Promise<void>((resolve) => {
			resolveBackendLookup = resolve;
		});
		const resolveBackend = jest.fn(async () => {
			await backendLookup;
			return {};
		});
		const service = new WebResearchService({} as SsrfProtectionService);
		const adapter = service.createLazyAdapter({
			scopeId: 'test-scope',
			resolveBackend,
		});
		const search = adapter.search;
		if (!search) throw new Error('Expected lazy web research adapter to expose search');

		const firstSearch = search('n8n agents');
		const secondSearch = search('n8n agents');

		expect(resolveBackend).toHaveBeenCalledTimes(1);
		resolveBackendLookup!();
		await expect(firstSearch).resolves.toEqual({ query: 'n8n agents', results: [] });
		await expect(secondSearch).resolves.toEqual({ query: 'n8n agents', results: [] });
		expect(resolveBackend).toHaveBeenCalledTimes(1);
	});
});
