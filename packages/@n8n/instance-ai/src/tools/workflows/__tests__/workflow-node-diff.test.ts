import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { computeChangedNodeNames, downgradeUnchangedNodeBlockers } from '../workflow-node-diff';
import { partitionWarnings, type ValidationWarning } from '../workflow-validation-warnings';
import { detectArrayInputCollapse } from '../detect-array-input-collapse';

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
	const finding = (overrides: Partial<ValidationWarning> = {}): ValidationWarning => ({
		code: 'CUSTOM_NODE_FINDING',
		message: 'Existing configuration needs attention.',
		nodeName: 'Send a message',
		scope: 'node',
		severity: 'warning',
		...overrides,
	});
	const saved = () => makeWorkflow([makeNode(), makeComposeNode()]);
	const classify = (
		built: WorkflowJSON,
		baseline = saved(),
		warning = finding(),
		before = [warning],
	) => downgradeUnchangedNodeBlockers([warning], built, baseline, before)[0];

	it.each([
		'CUSTOM_NODE_FINDING',
		'HARDCODED_CREDENTIALS',
		'SWITCH_NO_OUTPUT_CONNECTIONS',
		'UNKNOWN_CONFIG_KEY',
	])('preserves an existing %s finding during an unrelated edit', (code) => {
		const built = saved();
		built.nodes[1].parameters = { jsCode: 'return [{ json: { updated: true } }];' };
		const result = classify(built, saved(), finding({ code }));
		expect(result.severity).toBe('informational');
		expect(result.message).toContain('Existing configuration needs attention.');
	});

	it('preserves a node configuration error confirmed by the baseline', () => {
		expect(classify(saved(), saved(), finding({ severity: 'error' })).severity).toBe(
			'informational',
		);
	});

	it.each([
		['parameters', { parameters: { options: { changed: true } } }],
		['type', { type: 'n8n-nodes-base.telegram' }],
		['version', { typeVersion: 1 }],
		['credentials', { credentials: { gmailOAuth2: { id: 'new', name: 'New account' } } }],
		['disabled state', { disabled: true }],
		['error behavior', { onError: 'continueRegularOutput' as const }],
		['execution count', { executeOnce: true }],
		['identity', { id: 'new-node' }],
		['webhook identity', { webhookId: 'new-webhook' }],
	])('keeps findings blocking after a change to %s', (_name, override) => {
		const built = makeWorkflow([makeNode(override), makeComposeNode()]);
		expect(classify(built).severity).toBe('warning');
	});

	it('keeps findings blocking on new nodes', () => {
		expect(classify(saved(), makeWorkflow([])).severity).toBe('warning');
	});

	it('requires both saved state and completed baseline validation', () => {
		const warnings = [finding()];
		expect(downgradeUnchangedNodeBlockers(warnings, saved(), undefined, warnings)).toBe(warnings);
		expect(downgradeUnchangedNodeBlockers(warnings, saved(), saved())).toBe(warnings);
		expect(classify(saved(), saved(), finding(), []).severity).toBe('warning');
	});

	it.each(['workflow', undefined] as const)('keeps %s-scope findings blocking', (scope) => {
		expect(classify(saved(), saved(), finding({ scope })).severity).toBe('warning');
	});

	it('keeps findings without a named node blocking', () => {
		expect(classify(saved(), saved(), finding({ nodeName: undefined })).severity).toBe('warning');
	});

	it('does not match a new finding to a different field or message', () => {
		const before = [finding({ parameterPath: 'options.first' })];
		expect(
			classify(saved(), saved(), finding({ parameterPath: 'options.second' }), before).severity,
		).toBe('warning');
		expect(
			classify(saved(), saved(), finding({ message: 'A different problem.' }), before).severity,
		).toBe('warning');
	});

	it('does not exempt a familiar code without matching baseline evidence', () => {
		expect(
			classify(saved(), saved(), finding({ code: 'HARDCODED_CREDENTIALS' }), []).severity,
		).toBe('warning');
	});

	it('keeps an increase in severity blocking', () => {
		expect(classify(saved(), saved(), finding({ severity: 'error' }), [finding()]).severity).toBe(
			'error',
		);
	});

	it('keeps additional occurrences of a finding blocking', () => {
		const result = downgradeUnchangedNodeBlockers([finding(), finding()], saved(), saved(), [
			finding(),
		]);
		expect(result.map((warning) => warning.severity)).toEqual(['informational', 'warning']);
	});

	it('preserves names and positions independently of diagnostic identity', () => {
		const built = makeWorkflow([
			makeNode({ name: 'Renamed', position: [100, 100] }),
			makeComposeNode(),
		]);
		const before = finding({ message: 'Send a message needs attention.' });
		const after = finding({ nodeName: 'Renamed', message: 'Renamed needs attention.' });
		expect(classify(built, saved(), after, [before]).severity).toBe('informational');
	});

	it('pairs nodes without IDs by name', () => {
		const baseline = makeWorkflow([makeNode({ id: '' })]);
		expect(classify(structuredClone(baseline), baseline).severity).toBe('informational');
	});

	it.each(['incoming', 'outgoing'])(
		'keeps findings blocking after an %s connection changes',
		(direction) => {
			const built = saved();
			const source = direction === 'incoming' ? 'Compose' : 'Send a message';
			const destination = direction === 'incoming' ? 'Send a message' : 'Compose';
			built.connections = { [source]: { main: [[{ node: destination, type: 'main', index: 0 }]] } };
			expect(classify(built).severity).toBe('warning');
		},
	);

	it('keeps findings blocking after workflow settings change', () => {
		expect(classify({ ...saved(), settings: { executionOrder: 'v1' } }).severity).toBe('warning');
	});

	describe('existing Code findings', () => {
		const code =
			'const customer = $input.first().json[0];\nconst name = customer.nickname;\nreturn [{ json: { name } }];';
		function workflow(jsCode = code): WorkflowJSON {
			return makeWorkflow(
				[
					makeNode({
						type: 'n8n-nodes-base.httpRequest',
						parameters: { url: 'https://example.test' },
					}),
					makeComposeNode({ parameters: { jsCode } }),
				],
				{ 'Send a message': { main: [[{ node: 'Compose', type: 'main', index: 0 }]] } },
			);
		}
		async function compare(built: WorkflowJSON, baseline = workflow()) {
			return downgradeUnchangedNodeBlockers(
				await detectArrayInputCollapse(built),
				built,
				baseline,
				await detectArrayInputCollapse(baseline),
			);
		}

		it('allows a greeting edit after an unchanged array read', async () => {
			const built = workflow(
				code.replace('customer.nickname;', 'customer.nickname || customer.full_name;'),
			);
			expect(await compare(built)).toEqual([
				expect.objectContaining({ severity: 'informational' }),
			]);
		});

		it('allows a new greeting variable after the unchanged read', async () => {
			const built = workflow(
				code.replace(
					'const name = customer.nickname;',
					'const greetingName = customer.nickname || customer.full_name;\nconst name = greetingName;',
				),
			);
			expect((await compare(built))[0].severity).toBe('informational');
		});

		it.each([
			['changed read', code.replace('json[0]', 'json[1]')],
			[
				'additional read',
				code.replace('return [', 'const extra = $input.first().json[1];\nreturn ['),
			],
			['deferred code', code + '\nconst later = () => customer;'],
			['new binding', code + '\nconst $input = {};'],
		])('keeps a %s blocking', async (_name, nextCode) => {
			const findings = await compare(workflow(nextCode));
			expect(findings).toEqual([
				expect.objectContaining({ code: 'ARRAY_INPUT_COLLAPSED_TO_FIRST_ITEM' }),
			]);
			expect(partitionWarnings(findings).blocking).toEqual(findings);
		});

		describe('array callbacks', () => {
			const callbackCode =
				'const rows = $input.first().json.map(row => row.name);\n' +
				'const label = "Hello";\nreturn [{ json: { rows, label } }];';

			it('allows a later greeting edit after an unchanged callback', async () => {
				const findings = await compare(
					workflow(callbackCode.replace('"Hello"', '"Hi"')),
					workflow(callbackCode),
				);
				expect(findings).toEqual([
					expect.objectContaining({
						code: 'ARRAY_INPUT_COLLAPSED_TO_FIRST_ITEM',
						severity: 'informational',
					}),
				]);
			});

			it.each([
				['callback body', callbackCode.replace('row.name', 'row.full_name')],
				['input read', callbackCode.replace('$input.first()', '$input.all()[0]')],
			])('keeps a finding blocking after changing the %s', async (_name, edited) => {
				const findings = await compare(workflow(edited), workflow(callbackCode));
				expect(findings).toEqual([
					expect.objectContaining({ code: 'ARRAY_INPUT_COLLAPSED_TO_FIRST_ITEM' }),
				]);
				expect(partitionWarnings(findings).blocking).toEqual(findings);
			});

			it('keeps a finding blocking after its upstream input changes', async () => {
				const built = workflow(callbackCode.replace('"Hello"', '"Hi"'));
				built.nodes[0].parameters = { url: 'https://other.example.test' };
				const findings = await compare(built, workflow(callbackCode));
				expect(findings).toEqual([
					expect.objectContaining({ code: 'ARRAY_INPUT_COLLAPSED_TO_FIRST_ITEM' }),
				]);
				expect(partitionWarnings(findings).blocking).toEqual(findings);
			});
		});

		it('checks every input source when comparing a Code finding', async () => {
			const baseline = workflow();
			baseline.nodes.push(
				makeNode({
					id: 'second',
					name: 'Second input',
					type: 'n8n-nodes-base.set',
					parameters: { value: 1 },
				}),
			);
			baseline.connections['Second input'] = {
				main: [[{ node: 'Compose', type: 'main', index: 0 }]],
			};
			const built = structuredClone(baseline);
			built.nodes[1].parameters = {
				jsCode: code.replace('customer.nickname;', 'customer.nickname || customer.full_name;'),
			};
			built.nodes[2].parameters = { value: 2 };
			const result = downgradeUnchangedNodeBlockers(
				await detectArrayInputCollapse(built),
				built,
				baseline,
				await detectArrayInputCollapse(baseline),
			);
			expect(result[0].severity).not.toBe('informational');
		});

		it('keeps the finding blocking if its upstream configuration changes', async () => {
			const built = workflow(
				code.replace('customer.nickname;', 'customer.nickname || customer.full_name;'),
			);
			built.nodes[0].parameters = { url: 'https://other.example.test' };
			expect((await compare(built))[0].severity).not.toBe('informational');
		});
	});
});
