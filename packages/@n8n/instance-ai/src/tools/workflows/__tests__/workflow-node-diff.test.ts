import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { computeChangedNodeNames, downgradeUnchangedNodeBlockers } from '../workflow-node-diff';
import type { ValidationWarning } from '../workflow-validation-warnings';

type NodeJSON = WorkflowJSON['nodes'][number];

function makeWorkflow(nodes: NodeJSON[]): WorkflowJSON {
	return { name: 'Test', nodes, connections: {} };
}

function makeNode(overrides: Partial<NodeJSON> = {}): NodeJSON {
	return {
		id: 'node-1',
		name: 'Send a message',
		type: 'n8n-nodes-base.gmail',
		typeVersion: 2.2,
		parameters: { options: {} },
		position: [0, 0],
		...overrides,
	};
}

describe('computeChangedNodeNames', () => {
	it('returns an empty list when every node matches the saved workflow', () => {
		const node = makeNode();
		expect(computeChangedNodeNames(makeWorkflow([node]), makeWorkflow([{ ...node }]))).toEqual([]);
	});

	it('reports nodes missing from the saved workflow as changed', () => {
		const saved = makeWorkflow([makeNode()]);
		const built = makeWorkflow([makeNode(), makeNode({ name: 'New Node' })]);
		expect(computeChangedNodeNames(built, saved)).toEqual(['New Node']);
	});

	it.each([
		['parameters', { parameters: { options: {}, sendTo: 'a@b.c' } }],
		['type', { type: 'n8n-nodes-base.telegram' }],
		['typeVersion', { typeVersion: 2.1 }],
		['credentials', { credentials: { gmailOAuth2: { id: '1', name: 'Gmail' } } }],
		['disabled', { disabled: true }],
	])('reports a node with a different %s as changed', (_field, override) => {
		const saved = makeWorkflow([makeNode()]);
		const built = makeWorkflow([makeNode(override)]);
		expect(computeChangedNodeNames(built, saved)).toEqual(['Send a message']);
	});

	it('ignores position changes', () => {
		const saved = makeWorkflow([makeNode({ position: [0, 0] })]);
		const built = makeWorkflow([makeNode({ position: [100, 200] })]);
		expect(computeChangedNodeNames(built, saved)).toEqual([]);
	});

	it('treats missing parameters and empty parameters as equal', () => {
		const saved = makeWorkflow([makeNode({ parameters: undefined })]);
		const built = makeWorkflow([makeNode({ parameters: {} })]);
		expect(computeChangedNodeNames(built, saved)).toEqual([]);
	});
});

describe('downgradeUnchangedNodeBlockers', () => {
	const blocker = (nodeName?: string, code = 'INVALID_PARAMETER'): ValidationWarning => ({
		code,
		message: `Node "${nodeName}": Type mismatches: "parameters.sendTo" (expected string, got undefined).`,
		nodeName,
	});

	it('downgrades INVALID_PARAMETER on nodes whose parameters match the saved workflow', () => {
		const node = makeNode();
		const result = downgradeUnchangedNodeBlockers(
			[blocker('Send a message')],
			makeWorkflow([node]),
			makeWorkflow([{ ...node }]),
		);

		expect(result[0].severity).toBe('informational');
		expect(result[0].message).toContain('pre-existing node');
	});

	it('keeps INVALID_PARAMETER blocking on nodes the build changed', () => {
		const saved = makeWorkflow([makeNode()]);
		const built = makeWorkflow([makeNode({ parameters: { options: {}, sendTo: 'x' } })]);
		const result = downgradeUnchangedNodeBlockers([blocker('Send a message')], built, saved);

		expect(result[0].severity).toBeUndefined();
	});

	it('keeps INVALID_PARAMETER blocking on new nodes', () => {
		const saved = makeWorkflow([]);
		const built = makeWorkflow([makeNode()]);
		const result = downgradeUnchangedNodeBlockers([blocker('Send a message')], built, saved);

		expect(result[0].severity).toBeUndefined();
	});

	it('leaves other blocking codes untouched even on unchanged nodes', () => {
		const node = makeNode();
		const result = downgradeUnchangedNodeBlockers(
			[blocker('Send a message', 'UNKNOWN_CONFIG_KEY')],
			makeWorkflow([node]),
			makeWorkflow([{ ...node }]),
		);

		expect(result[0].severity).toBeUndefined();
	});

	it('returns warnings unchanged when there is no saved workflow', () => {
		const warnings = [blocker('Send a message')];
		expect(downgradeUnchangedNodeBlockers(warnings, makeWorkflow([makeNode()]), undefined)).toBe(
			warnings,
		);
	});

	it('does not compare credentials for the validation downgrade', () => {
		// Schema validation only concerns parameters; a restored credential must
		// not force strict validation back on for an otherwise untouched node.
		const saved = makeWorkflow([makeNode()]);
		const built = makeWorkflow([
			makeNode({ credentials: { gmailOAuth2: { id: '1', name: 'Gmail' } } }),
		]);
		const result = downgradeUnchangedNodeBlockers([blocker('Send a message')], built, saved);

		expect(result[0].severity).toBe('informational');
	});
});
