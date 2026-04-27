// packages/@n8n/agents/src/toolsets/__tests__/manifest.test.ts
import type { INodeTypeDescription } from 'n8n-workflow';

import { buildManifest } from '../manifest';
import type { OperationEntry } from '../types';

const DESCRIPTION = {
	displayName: 'Demo',
	description: 'A demo node',
} as INodeTypeDescription;

const OPS: OperationEntry[] = [
	{
		name: 'message:send',
		resource: 'message',
		operation: 'send',
		displayName: 'Send',
		description: 'Send a message',
		properties: [],
		required: [],
	},
	{
		name: 'message:get',
		resource: 'message',
		operation: 'get',
		displayName: 'Get',
		description: 'Get a message',
		properties: [],
		required: [],
	},
];

describe('buildManifest', () => {
	it('derives the manifest from displayName + description + grouped ops', () => {
		const out = buildManifest(DESCRIPTION, OPS);
		expect(out).toContain('Demo');
		expect(out).toContain('A demo node');
		// Per-resource summary line
		expect(out).toMatch(/message.*send.*get/i);
		// Tool-usage hint
		expect(out).toMatch(/list_operations/);
	});
});
