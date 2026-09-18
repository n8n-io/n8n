import type { WorkflowJSON } from '@n8n/workflow-sdk';

import {
	declaredOutputFixturesForBinding,
	MAX_DECLARED_OUTPUT_FIXTURES_CHARS,
	nodeOutputsForRegeneration,
} from '../workflow-declared-outputs';

const nodes: WorkflowJSON['nodes'] = [
	{
		id: 'http-1',
		name: 'Fetch',
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 4.5,
		position: [0, 0],
		parameters: {},
	},
	{
		id: 'slack-1',
		name: 'Post',
		type: 'n8n-nodes-base.slack',
		typeVersion: 2.7,
		position: [200, 0],
		parameters: {},
	},
];

describe('declaredOutputFixturesForBinding', () => {
	it('keeps fixtures for known nodes with their type and drops the rest', () => {
		expect(
			declaredOutputFixturesForBinding(
				{ Fetch: [{ summary: 'ok' }], Ghost: [{ x: 1 }], Post: [] },
				nodes,
			),
		).toEqual({ Fetch: { nodeType: 'n8n-nodes-base.httpRequest', items: [{ summary: 'ok' }] } });
	});

	it('returns undefined when nothing was declared or nothing survives', () => {
		expect(declaredOutputFixturesForBinding(undefined, nodes)).toBeUndefined();
		expect(declaredOutputFixturesForBinding({ Ghost: [{ x: 1 }] }, nodes)).toBeUndefined();
	});

	it('drops a fixture set too large for thread metadata', () => {
		const big = { Fetch: [{ blob: 'x'.repeat(MAX_DECLARED_OUTPUT_FIXTURES_CHARS) }] };
		expect(declaredOutputFixturesForBinding(big, nodes)).toBeUndefined();
	});
});

describe('nodeOutputsForRegeneration', () => {
	it('re-emits only for nodes that still exist under the same name and type', () => {
		const fixtures = {
			Fetch: { nodeType: 'n8n-nodes-base.httpRequest', items: [{ summary: 'ok' }] },
			Post: { nodeType: 'n8n-nodes-base.httpRequest', items: [{ stale: true }] },
			Gone: { nodeType: 'n8n-nodes-base.set', items: [{ x: 1 }] },
		};
		expect(nodeOutputsForRegeneration([fixtures], nodes)).toEqual({
			Fetch: [{ summary: 'ok' }],
		});
	});

	it('lets a later binding override an earlier one and returns undefined when empty', () => {
		const older = { Fetch: { nodeType: 'n8n-nodes-base.httpRequest', items: [{ v: 1 }] } };
		const newer = { Fetch: { nodeType: 'n8n-nodes-base.httpRequest', items: [{ v: 2 }] } };
		expect(nodeOutputsForRegeneration([older, undefined, newer], nodes)).toEqual({
			Fetch: [{ v: 2 }],
		});
		expect(nodeOutputsForRegeneration([undefined], nodes)).toBeUndefined();
	});
});
