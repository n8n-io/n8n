import { createNodeData } from './helpers';
import { computeNodeConfigHash } from '../compute-node-config-hash';

describe('computeNodeConfigHash', () => {
	test('produces consistent hash for identical configs', () => {
		const node = createNodeData({ name: 'Node1', parameters: { value: 'hello' } });

		const hash1 = computeNodeConfigHash(node);
		const hash2 = computeNodeConfigHash(node);

		expect(hash1).toBe(hash2);
		expect(typeof hash1).toBe('string');
		expect(hash1.length).toBe(64); // SHA-256 hex is 64 chars
	});

	test('different parameters produce different hash', () => {
		const node1 = createNodeData({ name: 'Node1', parameters: { value: 'hello' } });
		const node2 = createNodeData({ name: 'Node1', parameters: { value: 'world' } });

		expect(computeNodeConfigHash(node1)).not.toBe(computeNodeConfigHash(node2));
	});

	test('different credentials produce different hash', () => {
		const node1 = createNodeData({ name: 'Node1' });
		node1.credentials = { httpBasicAuth: { id: '1', name: 'My Creds' } };

		const node2 = createNodeData({ name: 'Node1' });
		node2.credentials = { httpBasicAuth: { id: '2', name: 'Other Creds' } };

		expect(computeNodeConfigHash(node1)).not.toBe(computeNodeConfigHash(node2));
	});

	test('position and name changes do not affect hash', () => {
		const node1 = createNodeData({ name: 'Node1', parameters: { value: 'test' } });
		node1.position = [100, 200];

		const node2 = createNodeData({ name: 'DifferentName', parameters: { value: 'test' } });
		node2.position = [999, 888];

		expect(computeNodeConfigHash(node1)).toBe(computeNodeConfigHash(node2));
	});

	test('key ordering does not affect hash (deterministic)', () => {
		const node1 = createNodeData({ name: 'Node1', parameters: { a: '1', b: '2', c: '3' } });
		const node2 = createNodeData({ name: 'Node1', parameters: { c: '3', a: '1', b: '2' } });

		expect(computeNodeConfigHash(node1)).toBe(computeNodeConfigHash(node2));
	});

	test('different type produces different hash', () => {
		const node1 = createNodeData({ name: 'Node1', type: 'n8n-nodes-base.set' });
		const node2 = createNodeData({ name: 'Node1', type: 'n8n-nodes-base.httpRequest' });

		expect(computeNodeConfigHash(node1)).not.toBe(computeNodeConfigHash(node2));
	});

	test('disabled state change produces different hash', () => {
		const node1 = createNodeData({ name: 'Node1', disabled: false });
		const node2 = createNodeData({ name: 'Node1', disabled: true });

		expect(computeNodeConfigHash(node1)).not.toBe(computeNodeConfigHash(node2));
	});

	test('nested parameters produce consistent hash regardless of key order', () => {
		const node1 = createNodeData({
			name: 'Node1',
			parameters: {
				options: { timeout: 5000, method: 'GET' },
				url: 'https://example.com',
			},
		});
		const node2 = createNodeData({
			name: 'Node1',
			parameters: {
				url: 'https://example.com',
				options: { method: 'GET', timeout: 5000 },
			},
		});

		expect(computeNodeConfigHash(node1)).toBe(computeNodeConfigHash(node2));
	});
});
