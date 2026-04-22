import { describe, test, expect } from 'vitest';
import type { InstanceAiWorkflowSetupNode } from '@n8n/api-types';
import {
	credGroupKey,
	isParamValueSet,
	isNestedParam,
	toNodeUi,
	isTriggerOnly,
	shouldUseCredentialIcon,
	type SetupCard,
} from '../instanceAiWorkflowSetup.utils';
import type { INodeProperties } from 'n8n-workflow';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSetupNode(
	overrides: Partial<InstanceAiWorkflowSetupNode> = {},
): InstanceAiWorkflowSetupNode {
	return {
		node: {
			name: 'Slack',
			type: 'n8n-nodes-base.slack',
			typeVersion: 2,
			parameters: {},
			position: [250, 300] as [number, number],
			id: 'node-1',
		},
		isTrigger: false,
		...overrides,
	} as InstanceAiWorkflowSetupNode;
}

function makeCard(overrides: Partial<SetupCard> = {}): SetupCard {
	return {
		id: 'card-1',
		nodes: [makeSetupNode()],
		isTrigger: false,
		isFirstTrigger: false,
		isTestable: false,
		isAutoApplied: false,
		hasParamIssues: false,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// credGroupKey
// ---------------------------------------------------------------------------

describe('credGroupKey', () => {
	test('returns credential type as key for standard nodes', () => {
		const req = makeSetupNode({ credentialType: 'slackApi' });
		expect(credGroupKey(req)).toBe('slackApi');
	});

	test('returns node name when credentialType is missing', () => {
		const req = makeSetupNode({ credentialType: undefined });
		expect(credGroupKey(req)).toBe('Slack');
	});

	test('includes URL for HTTP Request nodes', () => {
		const req = makeSetupNode({
			credentialType: 'httpBasicAuth',
			node: {
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4,
				parameters: { url: 'https://api.example.com' },
				position: [0, 0] as [number, number],
				id: 'node-http',
			},
		});
		expect(credGroupKey(req)).toBe('httpBasicAuth:http:https://api.example.com');
	});

	test('uses expression-specific key for HTTP Request with expression URL', () => {
		const req = makeSetupNode({
			credentialType: 'httpBasicAuth',
			node: {
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4,
				parameters: { url: '={{ $json.url }}' },
				position: [0, 0] as [number, number],
				id: 'node-http',
			},
		});
		expect(credGroupKey(req)).toBe('httpBasicAuth:http:expr:HTTP Request');
	});

	test('handles HTTP Request Tool node type', () => {
		const req = makeSetupNode({
			credentialType: 'httpBasicAuth',
			node: {
				name: 'HTTP Tool',
				type: 'n8n-nodes-base.httpRequestTool',
				typeVersion: 1,
				parameters: { url: 'https://api.test.com' },
				position: [0, 0] as [number, number],
				id: 'node-http-tool',
			},
		});
		expect(credGroupKey(req)).toContain('httpBasicAuth:http:');
	});
});

// ---------------------------------------------------------------------------
// isParamValueSet
// ---------------------------------------------------------------------------

describe('isParamValueSet', () => {
	test('returns false for undefined', () => {
		expect(isParamValueSet(undefined)).toBe(false);
	});

	test('returns false for null', () => {
		expect(isParamValueSet(null)).toBe(false);
	});

	test('returns false for empty string', () => {
		expect(isParamValueSet('')).toBe(false);
	});

	test('returns true for non-empty string', () => {
		expect(isParamValueSet('hello')).toBe(true);
	});

	test('returns true for number', () => {
		expect(isParamValueSet(42)).toBe(true);
	});

	test('returns true for boolean', () => {
		expect(isParamValueSet(false)).toBe(true);
	});

	test('returns false for empty resource locator', () => {
		expect(isParamValueSet({ __rl: true, value: '', mode: 'list' })).toBe(false);
	});

	test('returns true for non-empty resource locator', () => {
		expect(isParamValueSet({ __rl: true, value: 'some-id', mode: 'list' })).toBe(true);
	});

	test('returns false for placeholder sentinel string', () => {
		expect(isParamValueSet('<__PLACEHOLDER_VALUE__your_email__>')).toBe(false);
	});

	test('returns false for resource locator with placeholder sentinel value', () => {
		expect(
			isParamValueSet({
				__rl: true,
				value: '<__PLACEHOLDER_VALUE__channel_name__>',
				mode: 'list',
			}),
		).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// isNestedParam
// ---------------------------------------------------------------------------

describe('isNestedParam', () => {
	test('returns true for collection type', () => {
		expect(isNestedParam({ type: 'collection' } as INodeProperties)).toBe(true);
	});

	test('returns true for fixedCollection type', () => {
		expect(isNestedParam({ type: 'fixedCollection' } as INodeProperties)).toBe(true);
	});

	test('returns true for multipleValues typeOption', () => {
		expect(
			isNestedParam({
				type: 'string',
				typeOptions: { multipleValues: true },
			} as INodeProperties),
		).toBe(true);
	});

	test('returns false for simple string type', () => {
		expect(isNestedParam({ type: 'string' } as INodeProperties)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// toNodeUi
// ---------------------------------------------------------------------------

describe('toNodeUi', () => {
	test('maps setup node fields to INodeUi', () => {
		const req = makeSetupNode({
			node: {
				id: 'abc',
				name: 'Test',
				type: 'n8n-nodes-base.test',
				typeVersion: 3,
				position: [100, 200] as [number, number],
				parameters: { foo: 'bar' },
			},
		});
		const result = toNodeUi(req);
		expect(result.id).toBe('abc');
		expect(result.name).toBe('Test');
		expect(result.type).toBe('n8n-nodes-base.test');
		expect(result.typeVersion).toBe(3);
		expect(result.position).toEqual([100, 200]);
		expect(result.parameters).toEqual({ foo: 'bar' });
	});

	test('includes credentials when defined', () => {
		const req = makeSetupNode({
			node: {
				id: 'abc',
				name: 'Test',
				type: 'n8n-nodes-base.test',
				typeVersion: 1,
				position: [0, 0] as [number, number],
				parameters: {},
				credentials: { slackApi: { id: 'cred-1', name: 'My Slack' } },
			},
		});
		const result = toNodeUi(req);
		expect(result.credentials).toEqual({ slackApi: { id: 'cred-1', name: 'My Slack' } });
	});

	test('omits credentials when undefined', () => {
		const req = makeSetupNode({
			node: {
				id: 'abc',
				name: 'Test',
				type: 'n8n-nodes-base.test',
				typeVersion: 1,
				position: [0, 0] as [number, number],
				parameters: {},
				credentials: undefined,
			},
		});
		const result = toNodeUi(req);
		expect(result.credentials).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// isTriggerOnly / shouldUseCredentialIcon
// ---------------------------------------------------------------------------

describe('isTriggerOnly', () => {
	const noParamWork = () => false;
	const hasParamWork = () => true;

	test('returns true for trigger without credential or param work', () => {
		const card = makeCard({ isTrigger: true, credentialType: undefined });
		expect(isTriggerOnly(card, noParamWork)).toBe(true);
	});

	test('returns false if card has credential type', () => {
		const card = makeCard({ isTrigger: true, credentialType: 'slackApi' });
		expect(isTriggerOnly(card, noParamWork)).toBe(false);
	});

	test('returns false if card has param work', () => {
		const card = makeCard({ isTrigger: true });
		expect(isTriggerOnly(card, hasParamWork)).toBe(false);
	});

	test('returns false if not a trigger', () => {
		const card = makeCard({ isTrigger: false });
		expect(isTriggerOnly(card, noParamWork)).toBe(false);
	});
});

describe('shouldUseCredentialIcon', () => {
	test('returns true for multi-node credential-grouping cards', () => {
		const card = makeCard({
			credentialType: 'googleOAuth2Api',
			nodes: [makeSetupNode(), makeSetupNode(), makeSetupNode()],
		});
		expect(shouldUseCredentialIcon(card)).toBe(true);
	});

	test('returns false for single-node cards', () => {
		const card = makeCard({ credentialType: 'slackApi', nodes: [makeSetupNode()] });
		expect(shouldUseCredentialIcon(card)).toBe(false);
	});
});
