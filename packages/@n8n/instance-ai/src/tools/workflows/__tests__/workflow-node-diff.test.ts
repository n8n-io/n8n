import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { computeChangedNodeNames, downgradeUnchangedNodeBlockers } from '../workflow-node-diff';
import type { ValidationWarning } from '../workflow-validation-warnings';

type NodeJSON = WorkflowJSON['nodes'][number];

function makeWorkflow(
	nodes: NodeJSON[],
	connections: WorkflowJSON['connections'] = {},
): WorkflowJSON {
	return { name: 'Test', nodes, connections };
}

function makeComposeNode(overrides: Partial<NodeJSON> = {}): NodeJSON {
	return {
		id: 'node-2',
		name: 'Compose',
		type: 'n8n-nodes-base.code',
		typeVersion: 2,
		parameters: { jsCode: 'return [];' },
		position: [200, 0],
		...overrides,
	};
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

	it('pairs a renamed node by id and reports it as changed', () => {
		const saved = makeWorkflow([makeNode()]);
		const built = makeWorkflow([makeNode({ name: 'Send email' })]);
		expect(computeChangedNodeNames(built, saved)).toEqual(['Send email']);
	});

	it('reports a node whose connections changed even when its parameters are identical', () => {
		// The previously disconnected node gets wired into the flow.
		const nodes = [makeComposeNode(), makeNode()];
		const saved = makeWorkflow(nodes, {});
		const built = makeWorkflow(nodes, {
			Compose: { main: [[{ node: 'Send a message', type: 'main', index: 0 }]] },
		});
		expect(computeChangedNodeNames(built, saved).sort()).toEqual(['Compose', 'Send a message']);
	});

	it('does not treat a neighbour rename as a connection change (id-space signatures)', () => {
		const saved = makeWorkflow([makeComposeNode(), makeNode()], {
			Compose: { main: [[{ node: 'Send a message', type: 'main', index: 0 }]] },
		});
		const built = makeWorkflow([makeComposeNode({ name: 'Compose Update' }), makeNode()], {
			'Compose Update': { main: [[{ node: 'Send a message', type: 'main', index: 0 }]] },
		});
		// Only the renamed node changed; its neighbour's wiring is identical in id-space.
		expect(computeChangedNodeNames(built, saved)).toEqual(['Compose Update']);
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

	it.each([
		'UNKNOWN_CONFIG_KEY',
		'ARRAY_INPUT_COLLAPSED_TO_FIRST_ITEM',
		'MISSING_REQUIRED_INPUT',
		'SWITCH_FALLBACK_OUTPUT_DISABLED',
	])('keeps %s blocking even on unchanged nodes', (code) => {
		const node = makeNode();
		const finding = blocker('Send a message', code);
		const result = downgradeUnchangedNodeBlockers(
			[finding],
			makeWorkflow([node]),
			makeWorkflow([{ ...node }]),
		);

		expect(result).toEqual([finding]);
	});

	it('returns warnings unchanged when there is no saved workflow', () => {
		const warnings = [blocker('Send a message')];
		expect(downgradeUnchangedNodeBlockers(warnings, makeWorkflow([makeNode()]), undefined)).toBe(
			warnings,
		);
	});

	it('still downgrades on a node renamed but otherwise identical (paired by id)', () => {
		// Schema validation only concerns parameters; a rename does not make the
		// node's saved parameter shape any less proven.
		const saved = makeWorkflow([makeNode()]);
		const built = makeWorkflow([makeNode({ name: 'Send email' })]);
		const result = downgradeUnchangedNodeBlockers([blocker('Send email')], built, saved);

		expect(result[0].severity).toBe('informational');
	});

	it('does not downgrade blockers on a node that was wired into the flow', () => {
		// A disconnected node pulled into the flow just became load-bearing, so
		// its parameter problems are real again and must stay blocking.
		const nodes = [makeComposeNode(), makeNode()];
		const saved = makeWorkflow(nodes, {});
		const built = makeWorkflow(nodes, {
			Compose: { main: [[{ node: 'Send a message', type: 'main', index: 0 }]] },
		});
		const result = downgradeUnchangedNodeBlockers([blocker('Send a message')], built, saved);

		expect(result[0].severity).toBeUndefined();
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

	describe.each([
		{
			code: 'HARDCODED_CREDENTIALS',
			node: makeNode({
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				parameters: {
					url: 'https://example.test/records',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
					sendHeaders: true,
					headerParameters: { parameters: [{ name: 'apikey', value: 'example-key' }] },
					options: { timeout: 1000 },
				},
				credentials: { httpHeaderAuth: { id: 'header-1', name: 'Request header' } },
			}),
		},
		{
			code: 'SWITCH_NO_OUTPUT_CONNECTIONS',
			node: makeNode({
				type: 'n8n-nodes-base.switch',
				typeVersion: 3.2,
				parameters: { mode: 'rules', rules: { values: [] }, options: {} },
			}),
		},
	])('$code on saved nodes', ({ code, node }) => {
		const nodeName = 'Send a message';
		const finding: ValidationWarning = {
			code,
			nodeName,
			message: 'Existing node requires configuration.',
			severity: 'warning',
		};

		it('allows an edit to a different node without hiding the existing finding', () => {
			const connections: WorkflowJSON['connections'] = {
				Compose: { main: [[{ node: nodeName, type: 'main', index: 0 }]] },
			};
			const saved = makeWorkflow([makeComposeNode(), node], connections);
			const built = makeWorkflow(
				[
					makeComposeNode({ parameters: { jsCode: 'return [{ json: { updated: true } }];' } }),
					node,
				],
				connections,
			);

			expect(downgradeUnchangedNodeBlockers([finding], built, saved)).toEqual([
				{
					...finding,
					severity: 'informational',
					message: expect.stringContaining('pre-existing node, unchanged by this build'),
				},
			]);
		});

		it.each([
			['identity', { id: 'new-node' }],
			['parameters', { parameters: { options: { timeout: 2000 } } }],
			['type', { type: 'n8n-nodes-base.noOp' }],
			['typeVersion', { typeVersion: 1 }],
			[
				'credentials',
				{ credentials: { httpHeaderAuth: { id: 'header-2', name: 'Other header' } } },
			],
		])('keeps the finding blocking when %s changes', (_field, overrides) => {
			const saved = makeWorkflow([node]);
			const built = makeWorkflow([{ ...node, ...overrides }]);

			expect(downgradeUnchangedNodeBlockers([finding], built, saved)).toEqual([finding]);
		});

		it('keeps the finding blocking when the node is enabled', () => {
			const saved = makeWorkflow([{ ...node, disabled: true }]);
			const built = makeWorkflow([{ ...node, disabled: false }]);

			expect(downgradeUnchangedNodeBlockers([finding], built, saved)).toEqual([finding]);
		});

		it('keeps the finding blocking when an incoming connection is added', () => {
			const nodes = [makeComposeNode(), node];
			const saved = makeWorkflow(nodes);
			const built = makeWorkflow(nodes, {
				Compose: { main: [[{ node: nodeName, type: 'main', index: 0 }]] },
			});

			expect(downgradeUnchangedNodeBlockers([finding], built, saved)).toEqual([finding]);
		});

		it('keeps the finding blocking when an outgoing connection is removed', () => {
			const nodes = [makeComposeNode(), node];
			const saved = makeWorkflow(nodes, {
				[nodeName]: { main: [[{ node: 'Compose', type: 'main', index: 0 }]] },
			});
			const built = makeWorkflow(nodes);

			expect(downgradeUnchangedNodeBlockers([finding], built, saved)).toEqual([finding]);
		});

		it('keeps the finding blocking for a new node or a missing baseline', () => {
			const built = makeWorkflow([node]);

			expect(downgradeUnchangedNodeBlockers([finding], built, makeWorkflow([]))).toEqual([finding]);
			expect(downgradeUnchangedNodeBlockers([finding], built, undefined)).toEqual([finding]);
		});

		it('allows a rename and position change when identity and configuration are preserved', () => {
			const saved = makeWorkflow([node]);
			const built = makeWorkflow([{ ...node, name: 'Renamed', position: [100, 200] }]);

			expect(
				downgradeUnchangedNodeBlockers([{ ...finding, nodeName: 'Renamed' }], built, saved)[0]
					.severity,
			).toBe('informational');
		});

		it('pairs a node without an ID by name but does not infer a rename', () => {
			const saved = makeWorkflow([{ ...node, id: '' }]);
			const built = makeWorkflow([{ ...node, id: '' }]);
			expect(downgradeUnchangedNodeBlockers([finding], built, saved)[0].severity).toBe(
				'informational',
			);

			const renamed = makeWorkflow([{ ...node, id: '', name: 'Renamed' }]);
			const renamedFinding = { ...finding, nodeName: 'Renamed' };
			expect(downgradeUnchangedNodeBlockers([renamedFinding], renamed, saved)).toEqual([
				renamedFinding,
			]);
		});

		it('keeps a finding without a node name blocking', () => {
			const workflow = makeWorkflow([node]);
			const unnamedFinding = { ...finding, nodeName: undefined };

			expect(downgradeUnchangedNodeBlockers([unnamedFinding], workflow, workflow)).toEqual([
				unnamedFinding,
			]);
		});
	});

	it('downgrades chat_model_validation on unchanged nodes and keeps it on changed nodes', () => {
		const chatModelSaved = makeNode({
			id: 'cm-1',
			name: 'OpenAI Chat Model',
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			parameters: { model: 'gpt-4o-mini' },
		});
		const chatModelBuilt = makeNode({
			id: 'cm-1',
			name: 'OpenAI Chat Model',
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			parameters: { model: 'gpt-4o-mini' },
		});
		const saved = makeWorkflow([chatModelSaved]);
		const built = makeWorkflow([chatModelBuilt]);

		const chatModelWarning: ValidationWarning = {
			code: 'chat_model_validation',
			message: 'OpenAI Chat Model: Model "gpt-4o-mini" is deprecated.',
			nodeName: 'OpenAI Chat Model',
			severity: 'error',
		};

		const unchangedResult = downgradeUnchangedNodeBlockers([chatModelWarning], built, saved);
		expect(unchangedResult[0].severity).toBe('informational');
		expect(unchangedResult[0].message).toContain('pre-existing node, unchanged by this build');

		const modifiedBuilt = makeWorkflow([
			makeNode({
				id: 'cm-1',
				name: 'OpenAI Chat Model',
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				parameters: { model: 'gpt-4o-mini', options: { temperature: 0.7 } },
			}),
		]);
		const modifiedResult = downgradeUnchangedNodeBlockers([chatModelWarning], modifiedBuilt, saved);
		expect(modifiedResult[0].severity).toBe('error');

		const rewiredCredsBuilt = makeWorkflow([
			makeNode({
				id: 'cm-1',
				name: 'OpenAI Chat Model',
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				parameters: { model: 'gpt-4o-mini' },
				credentials: { openAiApi: { id: 'new-cred', name: 'New OpenAI' } },
			}),
		]);
		const rewiredCredsResult = downgradeUnchangedNodeBlockers(
			[chatModelWarning],
			rewiredCredsBuilt,
			saved,
		);
		expect(rewiredCredsResult[0].severity).toBe('error');
	});
});
