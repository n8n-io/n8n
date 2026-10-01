import type { INode } from 'n8n-workflow';

import { extractNodeConfig } from '../node-config';

const makeNode = (parameters: Record<string, unknown>): INode =>
	({ parameters }) as unknown as INode;

describe('extractNodeConfig', () => {
	it('should return JSON.stringify of node.parameters', () => {
		const node = makeNode({ url: 'https://example.com', method: 'GET' });
		expect(extractNodeConfig(node)).toBe('{"url":"https://example.com","method":"GET"}');
	});

	it('should return empty string for falsy parameters', () => {
		expect(extractNodeConfig({ parameters: undefined } as unknown as INode)).toBe('');
		expect(extractNodeConfig({ parameters: null } as unknown as INode)).toBe('');
	});

	it('should return empty string when JSON.stringify throws', () => {
		const circular: Record<string, unknown> = { key: 'value' };
		circular.self = circular;
		expect(extractNodeConfig(makeNode(circular))).toBe('');
	});
});
