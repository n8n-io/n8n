import { safeNodeTypesProvider } from './safe-node-types-provider';
import type { NodeTypesProvider } from './types';

describe('safeNodeTypesProvider', () => {
	it('passes a resolved node type through', () => {
		const description = { displayName: 'Set', properties: [] };
		const provider: NodeTypesProvider = { getByNameAndVersion: () => ({ description }) };

		const resolved = safeNodeTypesProvider(provider).getByNameAndVersion('n8n-nodes-base.set', 3.4);

		expect(resolved?.description).toBe(description);
	});

	it('returns undefined when the lookup throws', () => {
		const provider: NodeTypesProvider = {
			getByNameAndVersion: () => {
				throw new Error('Node type "set" is not available in version 99');
			},
		};

		expect(
			safeNodeTypesProvider(provider).getByNameAndVersion('n8n-nodes-base.set', 99),
		).toBeUndefined();
	});
});
