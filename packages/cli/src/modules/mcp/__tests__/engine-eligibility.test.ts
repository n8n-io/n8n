import type { INode } from 'n8n-workflow';

import {
	applyEngineDecision,
	decideEngine,
	describeEngineDecision,
	toEligibilityWorkflow,
	type EngineContext,
} from '../tools/workflow-builder/engine-eligibility';

const node = (name: string, type: string, parameters = {}): INode => ({
	id: name,
	name,
	type,
	typeVersion: 1,
	position: [0, 0],
	parameters,
});

/** A trigger and a Set node: engine v2 runs this. */
const runnable = {
	nodes: [node('Trigger', 'n8n-nodes-base.manualTrigger'), node('Set', 'n8n-nodes-base.set')],
	connections: { Trigger: { main: [[{ node: 'Set', type: 'main' as const, index: 0 }]] } },
};

/** A Form Trigger: engine v2 refuses this for now. */
const blocked = {
	nodes: [node('Form', 'n8n-nodes-base.formTrigger'), node('Set', 'n8n-nodes-base.set')],
	connections: { Form: { main: [[{ node: 'Set', type: 'main' as const, index: 0 }]] } },
};

const v2Default: EngineContext = { v2Available: true, defaultEngineType: 'v2' };
const v1Default: EngineContext = { v2Available: true, defaultEngineType: 'v1' };
const noV2: EngineContext = { v2Available: false, defaultEngineType: 'v1' };

describe('decideEngine', () => {
	test('says nothing when the instance has no engine v2', () => {
		expect(decideEngine({ ...blocked, settings: { engineType: 'v2' } }, noV2)).toBeUndefined();
	});

	test('a workflow that names v1 is not checked', () => {
		expect(decideEngine({ ...blocked, settings: { engineType: 'v1' } }, v2Default)).toEqual({
			engineType: 'v1',
			source: 'explicit',
			reasons: [],
		});
	});

	test('a workflow that names no engine gets the default when v2 runs it', () => {
		expect(decideEngine({ ...runnable, settings: {} }, v2Default)).toEqual({
			engineType: 'v2',
			source: 'default',
			reasons: [],
		});
		expect(decideEngine({ ...runnable, settings: {} }, v1Default)).toEqual({
			engineType: 'v1',
			source: 'default',
			reasons: [],
		});
	});

	// The "v2 if possible, else v1" rule: the author chose nothing, so the save
	// picks the engine that runs the workflow and says why.
	test('a workflow that names no engine is put on v1 when v2 refuses it', () => {
		const decision = decideEngine({ ...blocked, settings: {} }, v2Default);

		expect(decision).toMatchObject({ engineType: 'v1', source: 'downgraded' });
		expect(decision?.reasons).toEqual([
			expect.objectContaining({ code: 'FORM_NODE', severity: 'blocking', nodeName: 'Form' }),
		]);
		expect(applyEngineDecision({}, decision)).toEqual({ engineType: 'v1' });
	});

	// The author asked for v2 by name, so the save does not quietly overrule them.
	test('a workflow that names v2 is blocked when v2 refuses it', () => {
		const decision = decideEngine({ ...blocked, settings: { engineType: 'v2' } }, v2Default);

		expect(decision).toMatchObject({ engineType: 'v2', source: 'blocked' });
		// Nothing is written for a block: the caller refuses the save instead.
		expect(applyEngineDecision({ engineType: 'v2' }, decision)).toEqual({ engineType: 'v2' });
	});

	test('a warning does not change the engine', () => {
		const decision = decideEngine(
			{ ...runnable, settings: { engineType: 'v2', redactionPolicy: 'all' } },
			v2Default,
		);

		expect(decision).toMatchObject({ engineType: 'v2', source: 'explicit' });
		expect(decision?.reasons).toEqual([
			expect.objectContaining({ code: 'REDACTION_POLICY', severity: 'warning' }),
		]);
	});
});

describe('describeEngineDecision', () => {
	test('a downgrade tells the client what happened and how to undo it', () => {
		const decision = decideEngine({ ...blocked, settings: {} }, v2Default)!;
		const output = describeEngineDecision(decision);

		expect(output.engineType).toBe('v1');
		expect(output.note).toContain('set to engine v1');
		expect(output.note).toContain('Form');
		expect(output.note).toContain('"v2"');
	});

	test('a block tells the client the two ways out', () => {
		const decision = decideEngine({ ...blocked, settings: { engineType: 'v2' } }, v2Default)!;
		const output = describeEngineDecision(decision);

		expect(output.note).toContain('Change the workflow');
		expect(output.note).toContain('"v1"');
	});

	test('a plain decision carries no note and no empty reasons', () => {
		const decision = decideEngine({ ...runnable, settings: {} }, v2Default)!;

		expect(describeEngineDecision(decision)).toEqual({ engineType: 'v2', source: 'default' });
	});
});

describe('toEligibilityWorkflow', () => {
	test('leaves out an unnamed node and keeps nested parameters', () => {
		const workflow = toEligibilityWorkflow({
			nodes: [
				{ id: 'a', type: 'n8n-nodes-base.stickyNote', typeVersion: 1, position: [0, 0] },
				{
					id: 'b',
					name: 'Loop',
					type: 'n8n-nodes-base.splitInBatches',
					typeVersion: 3,
					position: [0, 0],
					parameters: { batchSize: 1, options: { reset: true }, list: [{ a: 1 }] },
				},
			],
			connections: {},
			settings: { engineType: 'v2' },
		});

		expect(workflow.nodes.map((n) => n.name)).toEqual(['Loop']);
		expect(workflow.nodes[0].parameters).toEqual({
			batchSize: 1,
			options: { reset: true },
			list: [{ a: 1 }],
		});
		expect(workflow.settings).toEqual({ engineType: 'v2' });
	});
});
