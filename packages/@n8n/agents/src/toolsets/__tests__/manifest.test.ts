// packages/@n8n/agents/src/toolsets/__tests__/manifest.test.ts
import type { INodeTypeDescription } from 'n8n-workflow';

import { buildManifest } from '../manifest';
import type { AppDefinition, OperationEntry } from '../types';

const BASE_DEF: AppDefinition = {
	kind: 'demo',
	label: 'Demo',
	icon: 'mail',
	nodeType: 'demo',
	nodeTypeVersion: 1,
	credentialType: 'demoApi',
	scopes: {},
};

const DESCRIPTION = { description: 'A demo node' } as INodeTypeDescription;

const OPS: OperationEntry[] = [
	{
		name: 'message:send',
		resource: 'message',
		operation: 'send',
		displayName: 'Send',
		description: 'Send a message',
		properties: [],
		required: [],
		requiredScopes: [],
		destructive: true,
	},
	{
		name: 'message:get',
		resource: 'message',
		operation: 'get',
		displayName: 'Get',
		description: 'Get a message',
		properties: [],
		required: [],
		requiredScopes: [],
		destructive: false,
	},
];

describe('buildManifest', () => {
	it('returns the string when manifest is a string', () => {
		const def = { ...BASE_DEF, manifest: 'hand-written blob' };
		expect(buildManifest(def, DESCRIPTION, OPS)).toBe('hand-written blob');
	});

	it('calls the function when manifest is a function', () => {
		const def: AppDefinition = {
			...BASE_DEF,
			manifest: (d) => `derived: ${d.description}`,
		};
		expect(buildManifest(def, DESCRIPTION, OPS)).toBe('derived: A demo node');
	});

	it('uses the default deriver when manifest is undefined', () => {
		const out = buildManifest(BASE_DEF, DESCRIPTION, OPS);
		expect(out).toContain('Demo');
		expect(out).toContain('A demo node');
		// Per-resource summary line
		expect(out).toMatch(/message.*send.*get/i);
		// Tool-usage hint
		expect(out).toMatch(/list_operations/);
	});
});
