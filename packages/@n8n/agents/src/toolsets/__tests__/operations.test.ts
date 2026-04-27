import type { INodeTypeDescription } from 'n8n-workflow';

import { buildOperationsFromDescription } from '../operations';
import type { AppDefinition } from '../types';

const APP_DEF: AppDefinition = {
	kind: 'demo',
	label: 'Demo',
	icon: 'mail',
	nodeType: 'demo',
	nodeTypeVersion: 1,
	credentialType: 'demoApi',
	operations: {
		'message:send': { requiredScopes: ['scope.write'], destructive: true },
		'message:get': { requiredScopes: ['scope.read'] },
	},
	scopes: { fullAccessScope: 'scope.full' },
};

const DESCRIPTION = {
	properties: [
		{
			name: 'resource',
			type: 'options',
			default: 'message',
			options: [{ name: 'Message', value: 'message' }],
			displayName: 'Resource',
		},
		{
			name: 'operation',
			type: 'options',
			default: 'send',
			displayName: 'Operation',
			displayOptions: { show: { resource: ['message'] } },
			options: [
				{ name: 'Send', value: 'send', description: 'Send a message' },
				{ name: 'Get', value: 'get', description: 'Get a message' },
			],
		},
		{
			name: 'to',
			type: 'string',
			default: '',
			displayName: 'To',
			required: true,
			displayOptions: { show: { resource: ['message'], operation: ['send'] } },
		},
	],
} as unknown as INodeTypeDescription;

describe('buildOperationsFromDescription', () => {
	it('walks the node description into a list of OperationEntry', () => {
		const ops = buildOperationsFromDescription(DESCRIPTION, APP_DEF);

		expect(ops.map((o) => o.name)).toEqual(['message:send', 'message:get']);
		expect(ops[0].displayName).toBe('Send');
		expect(ops[0].description).toBe('Send a message');
		expect(ops[0].required).toEqual(['to']);
		expect(ops[0].requiredScopes).toEqual(['scope.write']);
		expect(ops[0].destructive).toBe(true);
		expect(ops[1].destructive).toBe(false);
	});

	it('omits status when grantedScopes is undefined', () => {
		const ops = buildOperationsFromDescription(DESCRIPTION, APP_DEF);
		expect(ops[0].status).toBeUndefined();
	});

	it('classifies "available" when scopes satisfy and op is non-destructive', () => {
		const ops = buildOperationsFromDescription(DESCRIPTION, APP_DEF, ['scope.read']);
		const get = ops.find((o) => o.name === 'message:get')!;
		expect(get.status).toBe('available');
		expect(get.statusReason).toBeUndefined();
	});

	it('classifies "caution" when scopes satisfy but op is destructive', () => {
		const ops = buildOperationsFromDescription(DESCRIPTION, APP_DEF, ['scope.write']);
		const send = ops.find((o) => o.name === 'message:send')!;
		expect(send.status).toBe('caution');
	});

	it('classifies "missing-scope" when a required scope is absent', () => {
		const ops = buildOperationsFromDescription(DESCRIPTION, APP_DEF, []);
		const send = ops.find((o) => o.name === 'message:send')!;
		expect(send.status).toBe('missing-scope');
		expect(send.statusReason).toMatch(/missing scope/i);
	});

	it('treats fullAccessScope as a wildcard satisfying any required scope', () => {
		const ops = buildOperationsFromDescription(DESCRIPTION, APP_DEF, ['scope.full']);
		const send = ops.find((o) => o.name === 'message:send')!;
		expect(send.status).toBe('caution'); // satisfied via wildcard, but destructive
		const get = ops.find((o) => o.name === 'message:get')!;
		expect(get.status).toBe('available');
	});

	it('returns empty array for null/undefined description', () => {
		expect(buildOperationsFromDescription(null, APP_DEF)).toEqual([]);
		expect(buildOperationsFromDescription(undefined, APP_DEF)).toEqual([]);
	});
});
