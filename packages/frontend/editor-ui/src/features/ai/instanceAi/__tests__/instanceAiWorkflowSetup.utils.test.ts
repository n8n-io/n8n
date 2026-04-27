import { describe, it, test, expect } from 'vitest';
import type { InstanceAiWorkflowSetupNode } from '@n8n/api-types';
import {
	buildSetupCardTitle,
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

	test('groups two non-HTTP nodes sharing a credential type under one key', () => {
		const slackA = makeSetupNode({
			credentialType: 'slackApi',
			node: {
				name: 'Slack A',
				type: 'n8n-nodes-base.slack',
				typeVersion: 2,
				parameters: {},
				position: [0, 0] as [number, number],
				id: 'a',
			},
		});
		const slackB = makeSetupNode({
			credentialType: 'slackApi',
			node: {
				name: 'Slack B',
				type: 'n8n-nodes-base.slack',
				typeVersion: 2,
				parameters: {},
				position: [0, 0] as [number, number],
				id: 'b',
			},
		});
		expect(credGroupKey(slackA)).toBe(credGroupKey(slackB));
	});

	test('splits HTTP Request nodes with different static URLs even for same credential type', () => {
		const httpA = makeSetupNode({
			credentialType: 'httpBasicAuth',
			node: {
				name: 'HTTP A',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4,
				parameters: { url: 'https://a.example.com' },
				position: [0, 0] as [number, number],
				id: 'a',
			},
		});
		const httpB = makeSetupNode({
			credentialType: 'httpBasicAuth',
			node: {
				name: 'HTTP B',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4,
				parameters: { url: 'https://b.example.com' },
				position: [0, 0] as [number, number],
				id: 'b',
			},
		});
		expect(credGroupKey(httpA)).not.toBe(credGroupKey(httpB));
	});

	test('groups HTTP Request nodes with the same static URL and credential type', () => {
		const httpA = makeSetupNode({
			credentialType: 'httpBasicAuth',
			node: {
				name: 'HTTP A',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4,
				parameters: { url: 'https://api.example.com' },
				position: [0, 0] as [number, number],
				id: 'a',
			},
		});
		const httpB = makeSetupNode({
			credentialType: 'httpBasicAuth',
			node: {
				name: 'HTTP B',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4,
				parameters: { url: 'https://api.example.com' },
				position: [0, 0] as [number, number],
				id: 'b',
			},
		});
		expect(credGroupKey(httpA)).toBe(credGroupKey(httpB));
	});

	test('splits HTTP Request nodes with expression URLs regardless of string equality', () => {
		const exprA = makeSetupNode({
			credentialType: 'httpBasicAuth',
			node: {
				name: 'HTTP A',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4,
				parameters: { url: '={{ $json.url }}' },
				position: [0, 0] as [number, number],
				id: 'a',
			},
		});
		const exprB = makeSetupNode({
			credentialType: 'httpBasicAuth',
			node: {
				name: 'HTTP B',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4,
				parameters: { url: '={{ $json.url }}' },
				position: [0, 0] as [number, number],
				id: 'b',
			},
		});
		expect(credGroupKey(exprA)).not.toBe(credGroupKey(exprB));
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

// ---------------------------------------------------------------------------
// buildSetupCardTitle
// ---------------------------------------------------------------------------

function makeNamedNode(name: string): InstanceAiWorkflowSetupNode {
	return {
		node: {
			name,
			type: 'n8n-nodes-base.slack',
			typeVersion: 2,
			parameters: {},
			position: [0, 0] as [number, number],
			id: name,
		},
		isTrigger: false,
		needsAction: true,
	} as InstanceAiWorkflowSetupNode;
}

function makeTitleCard(
	nodes: string[],
	credentialType: string | undefined = 'slackApi',
): SetupCard {
	return {
		id: 'c1',
		credentialType,
		nodes: nodes.map(makeNamedNode),
		isTrigger: false,
		isFirstTrigger: false,
		isTestable: false,
		isAutoApplied: false,
		hasParamIssues: false,
	};
}

const credLabel = () => 'Slack';

const t = (key: string, opts?: { interpolate?: Record<string, string | number> }) => {
	const templates: Record<string, string> = {
		'instanceAi.workflowSetup.cardTitleForNodes': 'Set up {name} for {nodes}',
		'instanceAi.workflowSetup.cardTitleForNodesPlusMore':
			'Set up {name} for {nodes} and {extra} more',
		'instanceAi.workflowSetup.cardTitleForNodesCount': 'Set up {name} for {count} nodes',
		'instanceAi.workflowSetup.cardTitleNodesSeparator': ', ',
	};
	const tpl = templates[key] ?? key;
	if (!opts?.interpolate) return tpl;
	return Object.entries(opts.interpolate).reduce(
		(acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
		tpl,
	);
};

describe('buildSetupCardTitle', () => {
	it('returns the raw node name for a single-node card with a credential (preserves current behavior, no trimming)', () => {
		expect(buildSetupCardTitle(makeTitleCard(['Send Welcome']), credLabel, t)).toBe('Send Welcome');
	});

	it('returns the raw node name for a single-node card even when credentialType is missing', () => {
		const card = { ...makeTitleCard(['Some Node']), credentialType: undefined };
		expect(buildSetupCardTitle(card, credLabel, t)).toBe('Some Node');
	});

	it('returns the literal "Setup" for a multi-node card with no credentialType', () => {
		const card = { ...makeTitleCard(['A', 'B']), credentialType: undefined };
		expect(buildSetupCardTitle(card, credLabel, t)).toBe('Setup');
	});

	it('joins all node names for 2-3 nodes', () => {
		expect(buildSetupCardTitle(makeTitleCard(['Send Welcome', 'Send Goodbye']), credLabel, t)).toBe(
			'Set up Slack for Send Welcome, Send Goodbye',
		);
	});

	it('uses the +N more form for 4+ nodes (showing first 3 names)', () => {
		expect(
			buildSetupCardTitle(
				makeTitleCard([
					'Send Welcome',
					'Send Goodbye',
					'Send Reminder',
					'Send Followup',
					'Send Bye',
				]),
				credLabel,
				t,
			),
		).toBe('Set up Slack for Send Welcome, Send Goodbye, Send Reminder and 2 more');
	});

	it('trims whitespace and applies a per-name length cap on multi-node titles only', () => {
		const longName = 'A'.repeat(80);
		const result = buildSetupCardTitle(makeTitleCard([longName, '   Trimmed   ']), credLabel, t);
		expect(result).toMatch(/A{39}…/); // 39 chars + ellipsis
		expect(result).toContain('Trimmed');
		expect(result).not.toContain('   Trimmed   ');
	});

	it('falls back to the dedicated count key if all multi-node names are blank/whitespace', () => {
		expect(buildSetupCardTitle(makeTitleCard(['   ', '   ', '   ']), credLabel, t)).toBe(
			'Set up Slack for 3 nodes',
		);
	});

	it('does NOT double-prefix "Set up" if the credential-label callback misbehaves', () => {
		// Defensive: even if a caller passes "Set up Slack" by mistake, we strip the leading "Set up " prefix.
		const result = buildSetupCardTitle(makeTitleCard(['A', 'B']), () => 'Set up Slack', t);
		expect(result).not.toContain('Set up Set up');
		expect(result).toBe('Set up Slack for A, B');
	});
});
