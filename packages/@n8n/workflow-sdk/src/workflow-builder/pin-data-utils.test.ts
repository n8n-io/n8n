/**
 * Tests for pin data utility functions
 */

import {
	hasNewCredential,
	isHttpRequestOrWebhook,
	isDataTableWithoutTable,
	shouldGeneratePinData,
} from './pin-data-utils';

// Helper to create minimal node-like objects for testing
function createNode(overrides: {
	type?: string;
	config?: {
		credentials?: Record<string, unknown>;
		subnodes?: Record<string, unknown>;
		parameters?: Record<string, unknown>;
	};
}) {
	return {
		type: overrides.type ?? 'n8n-nodes-base.set',
		name: 'Test Node',
		version: 1,
		config: overrides.config ?? {},
	} as unknown as Parameters<typeof hasNewCredential>[0];
}

describe('hasNewCredential', () => {
	it('returns false for node without credentials', () => {
		const node = createNode({});
		expect(hasNewCredential(node)).toBe(false);
	});

	it('returns false for node with regular credentials', () => {
		const node = createNode({
			config: {
				credentials: {
					googleApi: { id: 'abc123', name: 'My Google Cred' },
				},
			},
		});
		expect(hasNewCredential(node)).toBe(false);
	});

	it('returns true for node with __newCredential marker', () => {
		const node = createNode({
			config: {
				credentials: {
					googleApi: { __newCredential: true, name: 'New Cred' },
				},
			},
		});
		expect(hasNewCredential(node)).toBe(true);
	});

	it('returns true when subnode has __newCredential', () => {
		const node = createNode({
			config: {
				subnodes: {
					tool: {
						type: 'tool-node',
						name: 'Tool',
						config: {
							credentials: {
								slackApi: { __newCredential: true },
							},
						},
					},
				},
			},
		});
		expect(hasNewCredential(node)).toBe(true);
	});

	it('returns true when nested subnode array has __newCredential', () => {
		const node = createNode({
			config: {
				subnodes: {
					tools: [
						{
							type: 'tool-node',
							name: 'Tool1',
							config: { credentials: {} },
						},
						{
							type: 'tool-node',
							name: 'Tool2',
							config: {
								credentials: {
									api: { __newCredential: true },
								},
							},
						},
					],
				},
			},
		});
		expect(hasNewCredential(node)).toBe(true);
	});

	it('returns false when subnodes have no __newCredential', () => {
		const node = createNode({
			config: {
				subnodes: {
					tool: {
						type: 'tool-node',
						name: 'Tool',
						config: {
							credentials: {
								api: { id: 'existing' },
							},
						},
					},
				},
			},
		});
		expect(hasNewCredential(node)).toBe(false);
	});
});

describe('isHttpRequestOrWebhook', () => {
	it('returns true for httpRequest type', () => {
		expect(isHttpRequestOrWebhook('n8n-nodes-base.httpRequest')).toBe(true);
	});

	it('returns true for webhook type', () => {
		expect(isHttpRequestOrWebhook('n8n-nodes-base.webhook')).toBe(true);
	});

	it('returns false for other node types', () => {
		expect(isHttpRequestOrWebhook('n8n-nodes-base.set')).toBe(false);
		expect(isHttpRequestOrWebhook('n8n-nodes-base.if')).toBe(false);
		expect(isHttpRequestOrWebhook('@n8n/n8n-nodes-langchain.agent')).toBe(false);
	});
});

describe('isDataTableWithoutTable', () => {
	it('returns false for non-dataTable nodes', () => {
		const node = createNode({ type: 'n8n-nodes-base.set' });
		expect(isDataTableWithoutTable(node)).toBe(false);
	});

	it('returns true for dataTable node without dataTableId', () => {
		const node = createNode({
			type: 'n8n-nodes-base.dataTable',
			config: { parameters: {} },
		});
		expect(isDataTableWithoutTable(node)).toBe(true);
	});

	it('returns true for dataTable node with empty dataTableId value', () => {
		const node = createNode({
			type: 'n8n-nodes-base.dataTable',
			config: {
				parameters: {
					dataTableId: { value: '' },
				},
			},
		});
		expect(isDataTableWithoutTable(node)).toBe(true);
	});

	it('returns true for dataTable node with placeholder value', () => {
		const node = createNode({
			type: 'n8n-nodes-base.dataTable',
			config: {
				parameters: {
					dataTableId: { value: { __placeholder: true } },
				},
			},
		});
		expect(isDataTableWithoutTable(node)).toBe(true);
	});

	it('returns false for dataTable node with configured table', () => {
		const node = createNode({
			type: 'n8n-nodes-base.dataTable',
			config: {
				parameters: {
					dataTableId: { value: 'table-123' },
				},
			},
		});
		expect(isDataTableWithoutTable(node)).toBe(false);
	});
});

describe('shouldGeneratePinData', () => {
	it('returns true for node with __newCredential', () => {
		const node = createNode({
			config: {
				credentials: { api: { __newCredential: true } },
			},
		});
		expect(shouldGeneratePinData(node)).toBe(true);
	});

	it('returns true for httpRequest node', () => {
		const node = createNode({ type: 'n8n-nodes-base.httpRequest' });
		expect(shouldGeneratePinData(node)).toBe(true);
	});

	it('returns true for webhook node', () => {
		const node = createNode({ type: 'n8n-nodes-base.webhook' });
		expect(shouldGeneratePinData(node)).toBe(true);
	});

	it('returns true for dataTable node without table', () => {
		const node = createNode({
			type: 'n8n-nodes-base.dataTable',
			config: { parameters: {} },
		});
		expect(shouldGeneratePinData(node)).toBe(true);
	});

	it('returns false for regular node without special conditions', () => {
		const node = createNode({
			type: 'n8n-nodes-base.set',
			config: {
				credentials: { api: { id: 'existing' } },
			},
		});
		expect(shouldGeneratePinData(node)).toBe(false);
	});

	it('returns false for dataTable node with configured table', () => {
		const node = createNode({
			type: 'n8n-nodes-base.dataTable',
			config: {
				parameters: {
					dataTableId: { value: 'table-123' },
				},
			},
		});
		expect(shouldGeneratePinData(node)).toBe(false);
	});
});
