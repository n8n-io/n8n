import { parseWorkflowCode } from '../../codegen/parse-workflow-code';
import type { NodeInstance } from '../../types/base';
import { workflow } from '../../workflow-builder';
import { node, trigger, isIfElseBuilder, ifElse } from '../node-builders/node-builder';

// Helper type for IF node
type IfNode = NodeInstance<'n8n-nodes-base.if', string, unknown>;

describe('ifElse() factory function', () => {
	it('ifElse() creates an IF node with correct type', () => {
		const ifN = ifElse({ version: 2.2, config: { name: 'My IF' } });
		expect(ifN.type).toBe('n8n-nodes-base.if');
	});

	it('ifElse() uses provided version', () => {
		const ifN = ifElse({ version: 2.2, config: { name: 'My IF' } });
		expect(ifN.version).toBe('2.2');
	});

	it('ifElse() supports .onTrue() and .onFalse()', () => {
		const ifN = ifElse({ version: 2.2, config: { name: 'My IF' } });
		const trueBranch = node({ type: 'n8n-nodes-base.noOp', version: 1, config: {} });
		const falseBranch = node({ type: 'n8n-nodes-base.noOp', version: 1, config: {} });

		// Use non-null assertion since onTrue is only guaranteed on IF nodes
		const builder = ifN.onTrue!(trueBranch).onFalse(falseBranch);
		expect(isIfElseBuilder(builder)).toBe(true);
	});
});

describe('parseWorkflowCode with ifElse', () => {
	it('parseWorkflowCode recognizes ifElse()', () => {
		const code = `
export default workflow('test', 'Test')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} }))
  .to(ifElse({ version: 2.2, config: { name: 'Check' } }).onTrue(node({ type: 'n8n-nodes-base.noOp', version: 1, config: {} })).onFalse(null));
`;
		expect(() => parseWorkflowCode(code)).not.toThrow();
	});
});

describe('IF Else fluent API', () => {
	describe('ifNode.onTrue().onFalse() syntax', () => {
		it('should require an IF node for onTrue()', () => {
			const regularNode = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Set Node' },
			});
			const target = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Target' },
			});

			// onTrue() should throw on non-IF nodes
			expect(() => {
				(regularNode as unknown as IfNode).onTrue!(target);
			}).toThrow('.onTrue() is only available on IF nodes');
		});

		it('should require an IF node for onFalse()', () => {
			const regularNode = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Set Node' },
			});
			const target = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Target' },
			});

			// onFalse() should throw on non-IF nodes
			expect(() => {
				(regularNode as unknown as IfNode).onFalse!(target);
			}).toThrow('.onFalse() is only available on IF nodes');
		});

		it('should work with fluent syntax: ifNode.onTrue!(trueBranch).onFalse(falseBranch)', () => {
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			}) as IfNode;
			const trueBranch = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'True Branch' },
			});
			const falseBranch = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'False Branch' },
			});

			// Fluent syntax should work
			const builder = ifNode.onTrue!(trueBranch).onFalse(falseBranch);
			expect(isIfElseBuilder(builder)).toBe(true);
			expect(builder.ifNode).toBe(ifNode);
		});

		it('should return an IfElseBuilder', () => {
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			}) as IfNode;
			const trueBranch = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'True Branch' },
			});
			const falseBranch = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'False Branch' },
			});

			const builder = ifNode.onTrue!(trueBranch).onFalse(falseBranch);
			expect(isIfElseBuilder(builder)).toBe(true);
		});
	});

	describe('fluent API in workflow', () => {
		it('should support ifNode.onTrue!(trueBranch).onFalse(falseBranch) in workflow', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			}) as IfNode;
			const trueBranch = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'True Branch' },
			});
			const falseBranch = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'False Branch' },
			});
			const downstream = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Downstream' },
			});

			// Fluent syntax in workflow
			const wf = workflow('test-id', 'Test')
				.add(t)
				.to(ifNode.onTrue!(trueBranch).onFalse(falseBranch))
				.to(downstream);

			const json = wf.toJSON();

			// Should have: trigger, if, trueBranch, falseBranch, downstream
			expect(json.nodes).toHaveLength(5);

			// IF should connect to both branches
			const ifConns = json.connections['My IF'];
			expect(ifConns).toBeDefined();

			// true branch at output 0
			expect(ifConns.main[0]![0].node).toBe('True Branch');
			// false branch at output 1
			expect(ifConns.main[1]![0].node).toBe('False Branch');
		});

		it('should support null for empty branches', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			}) as IfNode;
			const trueBranch = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'True Branch' },
			});

			// Fluent syntax with only true branch (no false)
			const wf = workflow('test-id', 'Test').add(t).to(ifNode.onTrue!(trueBranch));

			const json = wf.toJSON();

			// Should have: trigger, if, trueBranch
			expect(json.nodes).toHaveLength(3);

			// IF should only connect to true branch
			const ifConns = json.connections['My IF'];
			expect(ifConns).toBeDefined();

			// true branch at output 0
			expect(ifConns.main[0]![0].node).toBe('True Branch');
			// false branch at output 1 - should be empty or undefined
			expect(ifConns.main[1]).toBeUndefined();
		});

		it('should support plain array for multiple targets from one branch', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			}) as IfNode;
			const targetA = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Target A' },
			});
			const targetB = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Target B' },
			});
			const targetC = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Target C' },
			});

			// Fluent syntax with plain array for fan-out
			const wf = workflow('test-id', 'Test')
				.add(t)
				.to(ifNode.onTrue!([targetA, targetB]).onFalse(targetC));

			const json = wf.toJSON();

			// Should have: trigger, if, targetA, targetB, targetC
			expect(json.nodes).toHaveLength(5);

			// IF should fan out from true branch to A and B
			const ifConns = json.connections['My IF'];
			expect(ifConns).toBeDefined();

			// true at output 0 - should have both targets
			expect(ifConns.main[0]).toHaveLength(2);
			const output0Targets = ifConns.main[0]!.map((c: { node: string }) => c.node).sort();
			expect(output0Targets).toEqual(['Target A', 'Target B']);

			// false at output 1
			expect(ifConns.main[1]![0].node).toBe('Target C');
		});

		it('should identify builder with isIfElseBuilder', () => {
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			}) as IfNode;
			const trueBranch = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'True Branch' },
			});
			const falseBranch = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'False Branch' },
			});

			// Fluent syntax
			const builder = ifNode.onTrue!(trueBranch).onFalse(falseBranch);
			expect(isIfElseBuilder(builder)).toBe(true);
		});

		it('should support chain passed to onTrue with internal connections', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			}) as IfNode;
			const nodeA = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Node A' },
			});
			const nodeB = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Node B' },
			});

			// Create chain: nodeA.to(nodeB)
			const chain = nodeA.to(nodeB);

			// Fluent syntax with chain in onTrue
			const wf = workflow('test-id', 'Test').add(t).to(ifNode.onTrue!(chain));

			const json = wf.toJSON();

			// Should have: trigger, if, nodeA, nodeB
			expect(json.nodes).toHaveLength(4);

			// IF should connect to chain head (Node A)
			const ifConns = json.connections['My IF'];
			expect(ifConns).toBeDefined();
			expect(ifConns.main[0]![0].node).toBe('Node A');

			// Chain internal connection: Node A -> Node B
			const nodeAConns = json.connections['Node A'];
			expect(nodeAConns).toBeDefined();
			expect(nodeAConns.main[0]![0].node).toBe('Node B');
		});

		it('should handle duplicate node names in true/false branches', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			}) as IfNode;
			const trueBranch = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Process' },
			});
			const falseBranch = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Process' },
			});

			const wf = workflow('test-id', 'Test')
				.add(t)
				.to(ifNode.onTrue!(trueBranch).onFalse(falseBranch));

			const json = wf.toJSON();

			// Should have: trigger, if, Process, Process 1
			expect(json.nodes).toHaveLength(4);

			const ifConns = json.connections['My IF'];
			expect(ifConns).toBeDefined();

			// true branch at output 0 — one should be "Process"
			const trueTarget = ifConns.main[0]![0].node;
			// false branch at output 1 — the other should be "Process 1" (deduped)
			const falseTarget = ifConns.main[1]![0].node;

			// Both must be connected (not pointing to the same name)
			expect(new Set([trueTarget, falseTarget]).size).toBe(2);
			expect([trueTarget, falseTarget].sort()).toEqual(['Process', 'Process 1']);
		});

		it('should handle duplicate-named chains in true/false branches', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			}) as IfNode;

			const trueHead = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Fetch' },
			});
			const trueTail = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Save' },
			});
			const trueChain = trueHead.to(trueTail);

			const falseHead = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Fetch' },
			});
			const falseTail = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Save' },
			});
			const falseChain = falseHead.to(falseTail);

			const wf = workflow('test-id', 'Test')
				.add(t)
				.to(ifNode.onTrue!(trueChain).onFalse(falseChain));

			const json = wf.toJSON();

			// Should have: trigger, if, Fetch, Save, Fetch 1, Save 1
			expect(json.nodes).toHaveLength(6);

			const ifConns = json.connections['My IF'];
			expect(ifConns).toBeDefined();

			const trueTarget = ifConns.main[0]![0].node;
			const falseTarget = ifConns.main[1]![0].node;

			// Both branches should point to different nodes
			expect(trueTarget).not.toBe(falseTarget);
			expect([trueTarget, falseTarget].sort()).toEqual(['Fetch', 'Fetch 1']);
		});
	});
});

describe('inline branch chains that end in an IF node', () => {
	it('expands a multi-node chain passed inline to .onFalse() instead of collapsing it', () => {
		// Repro from a production trace: the retry chain passed to .onFalse() used to
		// collapse to its IF tail. Build Repair 2, OpenRouter Call 2, and Validate Attempt 2
		// were silently dropped, and IF 1 connected straight to IF 2.
		const code = `
const t = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.1, config: { name: 'Sub Trigger' } });
const validate1 = node({ type: 'n8n-nodes-base.code', version: 2, config: { name: 'Validate Attempt 1' } });
const if1 = ifElse({ version: 2.2, config: { name: 'Attempt 1 Valid?' } });
const repair2 = node({ type: 'n8n-nodes-base.code', version: 2, config: { name: 'Build Repair 2' } });
const http2 = node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { name: 'OpenRouter Call 2' } });
const validate2 = node({ type: 'n8n-nodes-base.code', version: 2, config: { name: 'Validate Attempt 2' } });
const if2 = ifElse({ version: 2.2, config: { name: 'Attempt 2 Valid?' } });
const repair3 = node({ type: 'n8n-nodes-base.code', version: 2, config: { name: 'Build Repair 3' } });
const finalize = node({ type: 'n8n-nodes-base.code', version: 2, config: { name: 'Finalize' } });

export default workflow('test-id', 'Test')
  .add(t)
  .to(validate1)
  .to(if1)
  .onTrue(finalize)
  .onFalse(
    repair2
      .to(http2)
      .to(validate2)
      .to(if2)
      .onTrue(finalize)
      .onFalse(repair3.to(finalize))
  );
`;
		const json = parseWorkflowCode(code);

		const names = json.nodes.map((n) => n.name).sort();
		expect(names).toEqual([
			'Attempt 1 Valid?',
			'Attempt 2 Valid?',
			'Build Repair 2',
			'Build Repair 3',
			'Finalize',
			'OpenRouter Call 2',
			'Sub Trigger',
			'Validate Attempt 1',
			'Validate Attempt 2',
		]);

		// IF 1 false output lands on the chain head, not the inner IF
		expect(json.connections['Attempt 1 Valid?'].main[0]![0].node).toBe('Finalize');
		expect(json.connections['Attempt 1 Valid?'].main[1]![0].node).toBe('Build Repair 2');

		// Chain internal connections are preserved
		expect(json.connections['Build Repair 2'].main[0]![0].node).toBe('OpenRouter Call 2');
		expect(json.connections['OpenRouter Call 2'].main[0]![0].node).toBe('Validate Attempt 2');
		expect(json.connections['Validate Attempt 2'].main[0]![0].node).toBe('Attempt 2 Valid?');

		// Inner IF branches are wired
		expect(json.connections['Attempt 2 Valid?'].main[0]![0].node).toBe('Finalize');
		expect(json.connections['Attempt 2 Valid?'].main[1]![0].node).toBe('Build Repair 3');
		expect(json.connections['Build Repair 3'].main[0]![0].node).toBe('Finalize');
	});

	it('routes a nested branch target built from a chain to the chain head', () => {
		const t = trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { name: 'Start' },
		});
		const outerIf = node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: { name: 'Outer IF' },
		}) as IfNode;
		const ok = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'OK' } });
		const prep = node({ type: 'n8n-nodes-base.set', version: 3.4, config: { name: 'Prep' } });
		const innerIf = node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: { name: 'Inner IF' },
		}) as IfNode;
		const done = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'Done' } });
		const retry = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'Retry' } });

		const inner = prep.to(innerIf).onTrue!(done).onFalse(retry);
		const wf = workflow('test-id', 'Test').add(t).to(outerIf.onTrue!(ok).onFalse(inner));

		const json = wf.toJSON();

		const names = json.nodes.map((n) => n.name).sort();
		expect(names).toEqual(['Done', 'Inner IF', 'OK', 'Outer IF', 'Prep', 'Retry', 'Start']);

		expect(json.connections['Outer IF'].main[0]![0].node).toBe('OK');
		expect(json.connections['Outer IF'].main[1]![0].node).toBe('Prep');
		expect(json.connections['Prep'].main[0]![0].node).toBe('Inner IF');
		expect(json.connections['Inner IF'].main[0]![0].node).toBe('Done');
		expect(json.connections['Inner IF'].main[1]![0].node).toBe('Retry');
	});

	it('connects the prefix node to the IF node when the chain tail is an existing builder', () => {
		// t.to(builder) makes the builder the chain tail; .onFalse then returns that
		// same builder with the chain as its source chain. The chain-internal edge
		// must land on the IF node, not resolve back to the chain head (self-loop).
		const t = trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { name: 'Start' },
		});
		const ifNode = node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: { name: 'Route' },
		}) as IfNode;
		const yes = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'Yes' } });
		const no = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'No' } });

		const builder = ifNode.onTrue!(yes);
		const wf = workflow('test-id', 'Test').add(t.to(builder).onFalse!(no));

		const json = wf.toJSON();

		const names = json.nodes.map((n) => n.name).sort();
		expect(names).toEqual(['No', 'Route', 'Start', 'Yes']);

		expect(json.connections['Start'].main[0]![0].node).toBe('Route');
		expect(json.connections['Route'].main[0]![0].node).toBe('Yes');
		expect(json.connections['Route'].main[1]![0].node).toBe('No');
	});

	it('merges branches into the renamed IF node when its name collides with an existing node', () => {
		const t = trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { name: 'Start' },
		});
		const existingCheck = node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: { name: 'Check' },
		});
		const prep = node({ type: 'n8n-nodes-base.set', version: 3.4, config: { name: 'Prep' } });
		const check = node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: { name: 'Check' },
		}) as IfNode;
		const yes = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'Yes' } });
		const no = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'No' } });

		const wf = workflow('test-id', 'Test')
			.add(t)
			.to(existingCheck)
			.add(prep.to(check).onTrue!(yes).onFalse(no));

		const json = wf.toJSON();

		const names = json.nodes.map((n) => n.name).sort();
		expect(names).toEqual(['Check', 'Check 1', 'No', 'Prep', 'Start', 'Yes']);

		// The chain's IF node was renamed to 'Check 1'; the branches belong to it
		expect(json.connections['Prep'].main[0]![0].node).toBe('Check 1');
		expect(json.connections['Check 1'].main[0]![0].node).toBe('Yes');
		expect(json.connections['Check 1'].main[1]![0].node).toBe('No');
		// The pre-existing 'Check' must not receive the builder branches
		expect(json.connections['Check']).toBeUndefined();
	});

	it('keeps a second chain connected to the IF node when the first chain adds a branch', () => {
		// Two chains share one builder object. When one chain calls .onFalse, it records
		// itself as the builder's source chain. The other chain's edge must still land
		// on the IF node, not on the claiming chain's head.
		const check = node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: { name: 'Is Valid?' },
		}) as IfNode;
		const slack = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'Send Slack' } });
		const logError = node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { name: 'Log Error' },
		});
		const webhook = trigger({
			type: 'n8n-nodes-base.webhook',
			version: 2,
			config: { name: 'Webhook' },
		});
		const schedule = trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: { name: 'Schedule' },
		});

		const branch = check.onTrue!(slack);
		const fromWebhook = webhook.to(branch);
		const fromSchedule = schedule.to(branch);

		const json = workflow('id', 'w').add(fromWebhook.onFalse!(logError)).add(fromSchedule).toJSON();

		expect(json.connections['Schedule'].main[0]![0].node).toBe('Is Valid?');
		expect(json.connections['Webhook'].main[0]![0].node).toBe('Is Valid?');
		expect(json.connections['Is Valid?'].main[0]![0].node).toBe('Send Slack');
		expect(json.connections['Is Valid?'].main[1]![0].node).toBe('Log Error');
	});

	it('keeps a second chain connected to the IF node regardless of add order', () => {
		const check = node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: { name: 'Is Valid?' },
		}) as IfNode;
		const slack = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'Send Slack' } });
		const logError = node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { name: 'Log Error' },
		});
		const webhook = trigger({
			type: 'n8n-nodes-base.webhook',
			version: 2,
			config: { name: 'Webhook' },
		});
		const schedule = trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: { name: 'Schedule' },
		});

		const branch = check.onTrue!(slack);
		const fromWebhook = webhook.to(branch);
		const fromSchedule = schedule.to(branch);

		const json = workflow('id', 'w').add(fromSchedule).add(fromWebhook.onFalse!(logError)).toJSON();

		expect(json.connections['Schedule'].main[0]![0].node).toBe('Is Valid?');
		expect(json.connections['Webhook'].main[0]![0].node).toBe('Is Valid?');
	});

	it('routes a branch edge into a shared builder to the IF node, not the claiming chain head', () => {
		// A builder claimed by a feeder chain (webhook.to(branch).onFalse(...)) can also
		// be referenced as a branch target of another IF. That branch edge must land on
		// the builder's IF node, not on the feeder chain's head.
		const t = trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { name: 'Start' },
		});
		const outer = node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: { name: 'Outer IF' },
		}) as IfNode;
		const ok = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'OK' } });
		const check = node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: { name: 'Is Valid?' },
		}) as IfNode;
		const slack = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'Send Slack' } });
		const logError = node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { name: 'Log Error' },
		});
		const webhook = trigger({
			type: 'n8n-nodes-base.webhook',
			version: 2,
			config: { name: 'Webhook' },
		});

		const branch = check.onTrue!(slack);
		const claimed = webhook.to(branch).onFalse!(logError);

		const json = workflow('id', 'w')
			.add(t)
			.to(outer.onTrue!(ok).onFalse(branch))
			.add(claimed)
			.toJSON();

		const names = json.nodes.map((n) => n.name).sort();
		expect(names).toEqual([
			'Is Valid?',
			'Log Error',
			'OK',
			'Outer IF',
			'Send Slack',
			'Start',
			'Webhook',
		]);

		expect(json.connections['Outer IF'].main[0]![0].node).toBe('OK');
		expect(json.connections['Outer IF'].main[1]![0].node).toBe('Is Valid?');
		expect(json.connections['Webhook'].main[0]![0].node).toBe('Is Valid?');
		expect(json.connections['Is Valid?'].main[0]![0].node).toBe('Send Slack');
		expect(json.connections['Is Valid?'].main[1]![0].node).toBe('Log Error');
	});

	it('routes a workflow cursor edge into a shared builder to the IF node', () => {
		// wf.add(schedule).to(sharedBuilder): the cursor edge resolves through the
		// composite head. A builder claimed by another chain must expose the IF node
		// as its entry, not the claiming chain's head.
		const check = node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: { name: 'Is Valid?' },
		}) as IfNode;
		const slack = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'Send Slack' } });
		const logError = node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { name: 'Log Error' },
		});
		const webhook = trigger({
			type: 'n8n-nodes-base.webhook',
			version: 2,
			config: { name: 'Webhook' },
		});
		const schedule = trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: { name: 'Schedule' },
		});

		const branch = check.onTrue!(slack);
		const fromWebhook = webhook.to(branch);

		const json = workflow('id', 'w')
			.add(fromWebhook.onFalse!(logError))
			.add(schedule)
			.to(branch)
			.toJSON();

		expect(json.connections['Schedule'].main[0]![0].node).toBe('Is Valid?');
		expect(json.connections['Webhook'].main[0]![0].node).toBe('Is Valid?');
	});

	it('routes a composite literal branch into a shared builder to the IF node', () => {
		// { ifNode, trueBranch, falseBranch } literals resolve branch entries through
		// addBranchToGraph. A shared builder branch must land on its IF node.
		const check = node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: { name: 'Is Valid?' },
		}) as IfNode;
		const slack = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'Send Slack' } });
		const logError = node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { name: 'Log Error' },
		});
		const webhook = trigger({
			type: 'n8n-nodes-base.webhook',
			version: 2,
			config: { name: 'Webhook' },
		});
		const t = trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { name: 'Start' },
		});
		const ok = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'OK' } });

		const branch = check.onTrue!(slack);
		const claimed = webhook.to(branch).onFalse!(logError);

		const outerIfNode = ifElse({ version: 2.2, config: { name: 'Outer IF' } });
		const outer = {
			ifNode: outerIfNode,
			trueBranch: ok,
			falseBranch: branch,
		} as unknown as Parameters<ReturnType<typeof workflow>['to']>[0];
		const json = workflow('id', 'w').add(t).to(outer).add(claimed).toJSON();

		expect(json.connections['Outer IF'].main[0]![0].node).toBe('OK');
		expect(json.connections['Outer IF'].main[1]![0].node).toBe('Is Valid?');
		expect(json.connections['Webhook'].main[0]![0].node).toBe('Is Valid?');
	});

	it('enters at the IF node when a cursor edge targets an inline chain that feeds an existing builder', () => {
		// .to(prep.to(builder).onFalse(x)) returns the builder itself, and the same
		// object can be shared by other chains. The cursor edge lands on the IF node;
		// the feeder keeps its own retargeted edge into the IF node.
		const check = node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: { name: 'Is Valid?' },
		}) as IfNode;
		const slack = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'Send Slack' } });
		const logError = node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { name: 'Log Error' },
		});
		const prev = trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { name: 'Start' },
		});
		const feeder = node({ type: 'n8n-nodes-base.set', version: 3.4, config: { name: 'Prep' } });

		const branch = check.onTrue!(slack);

		const json = workflow('id', 'w').add(prev).to(feeder.to(branch).onFalse!(logError)).toJSON();

		expect(json.connections['Start'].main[0]![0].node).toBe('Is Valid?');
		expect(json.connections['Prep'].main[0]![0].node).toBe('Is Valid?');
		expect(json.connections['Is Valid?'].main[0]![0].node).toBe('Send Slack');
		expect(json.connections['Is Valid?'].main[1]![0].node).toBe('Log Error');
	});

	it('materializes every chain that claims a shared builder, not only the last one', () => {
		// Two chains claim the same builder via chain-position onX. Both are feeders
		// into the IF node; both must reach the graph. Keeping only the last claim
		// drops the earlier chain's nodes.
		const check = node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: { name: 'Is Valid?' },
		}) as IfNode;
		const slack = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'Send Slack' } });
		const logError = node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { name: 'Log Error' },
		});
		const webhook = trigger({
			type: 'n8n-nodes-base.webhook',
			version: 2,
			config: { name: 'Webhook' },
		});
		const schedule = trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: { name: 'Schedule' },
		});
		const t = trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { name: 'Start' },
		});
		const ok = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'OK' } });
		const outer = node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: { name: 'Outer IF' },
		}) as IfNode;

		const branch = check.onTrue!(slack);
		webhook.to(branch).onFalse!(logError);
		schedule.to(branch).onTrue!(slack);

		const json = workflow('id', 'w').add(t).to(outer.onTrue!(ok).onFalse(branch)).toJSON();

		const names = json.nodes.map((n) => n.name).sort();
		expect(names).toEqual([
			'Is Valid?',
			'Log Error',
			'OK',
			'Outer IF',
			'Schedule',
			'Send Slack',
			'Start',
			'Webhook',
		]);
		expect(json.connections['Webhook'].main[0]![0].node).toBe('Is Valid?');
		expect(json.connections['Schedule'].main[0]![0].node).toBe('Is Valid?');
	});

	it('keeps the prefix entry when a feeder chain also claims the builder', () => {
		// prep.to(ifNode).onTrue(x) creates the builder with a prefix chain. A second
		// chain claiming it via onFalse is a feeder: it wires straight into the IF node
		// and must not displace the prefix entry or drop the prefix nodes.
		const ifNode = node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: { name: 'Is Valid?' },
		}) as IfNode;
		const slack = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'Send Slack' } });
		const logError = node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { name: 'Log Error' },
		});
		const prep = node({ type: 'n8n-nodes-base.set', version: 3.4, config: { name: 'Prep' } });
		const webhook = trigger({
			type: 'n8n-nodes-base.webhook',
			version: 2,
			config: { name: 'Webhook' },
		});
		const t = trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { name: 'Start' },
		});

		const branch = prep.to(ifNode).onTrue!(slack);
		webhook.to(branch).onFalse!(logError);

		const json = workflow('id', 'w').add(t).to(branch).toJSON();

		const names = json.nodes.map((n) => n.name).sort();
		expect(names).toEqual(['Is Valid?', 'Log Error', 'Prep', 'Send Slack', 'Start', 'Webhook']);
		expect(json.connections['Start'].main[0]![0].node).toBe('Prep');
		expect(json.connections['Prep'].main[0]![0].node).toBe('Is Valid?');
		expect(json.connections['Webhook'].main[0]![0].node).toBe('Is Valid?');
		expect(json.connections['Is Valid?'].main[0]![0].node).toBe('Send Slack');
		expect(json.connections['Is Valid?'].main[1]![0].node).toBe('Log Error');
	});
});
