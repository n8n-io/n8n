import { parseWorkflowCode } from '../../codegen/parse-workflow-code';
import { workflow } from '../../workflow-builder';
import { node, trigger, ifElse, switchCase } from '../node-builders/node-builder';

// Regression: builders frequently reach for `.to(ifNode).onTrue(target)` —
// branching off the builder cursor instead of pre-attaching branches with
// `.to(ifNode.onTrue(target))`. This used to fail with "Cannot call
// non-function" because the WorkflowBuilder had no onTrue/onFalse/onCase.
describe('branch chaining off the builder cursor', () => {
	it('parses .to(ifElse(...)).onTrue(...).onFalse(...) without throwing', () => {
		const code = `
export default workflow('w', 'W')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} }))
  .to(ifElse({ version: 2.3, config: { name: 'Check' } }))
  .onTrue(node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'Yes' } }))
  .onFalse(node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'No' } }));
`;
		expect(() => parseWorkflowCode(code)).not.toThrow();
	});

	it('wires both IF outputs when branching off the cursor', () => {
		const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
		const ifNode = ifElse({ version: 2.3, config: { name: 'My IF' } });
		const yes = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'Yes' } });
		const no = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'No' } });

		const json = workflow('id', 'Test').add(t).to(ifNode).onTrue(yes).onFalse(no).toJSON();

		const ifConns = json.connections['My IF'];
		expect(ifConns.main[0]![0].node).toBe('Yes');
		expect(ifConns.main[1]![0].node).toBe('No');
	});

	it('supports a chain target on a branch', () => {
		const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
		const ifNode = ifElse({ version: 2.3, config: { name: 'My IF' } });
		const head = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'Head' } });
		const tail = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'Tail' } });

		const json = workflow('id', 'Test').add(t).to(ifNode).onTrue(head.to(tail)).toJSON();

		expect(json.connections['My IF'].main[0]![0].node).toBe('Head');
		expect(json.connections.Head.main[0]![0].node).toBe('Tail');
	});

	it('skips null IF branch targets while keeping sibling branches anchored', () => {
		const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
		const ifNode = ifElse({ version: 2.3, config: { name: 'My IF' } });
		const no = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'No' } });

		const json = workflow('id', 'Test').add(t).to(ifNode).onTrue(null).onFalse(no).toJSON();

		const ifConns = json.connections['My IF'];
		expect(ifConns.main[0]).toEqual([]);
		expect(ifConns.main[1]![0].node).toBe('No');
	});

	it('wires Switch outputs when branching off the cursor', () => {
		const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
		const sw = switchCase({ version: 3.2, config: { name: 'Route' } });
		const a = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'A' } });
		const b = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'B' } });

		const json = workflow('id', 'Test').add(t).to(sw).onCase(0, a).onCase(1, b).toJSON();

		const swConns = json.connections.Route;
		expect(swConns.main[0]![0].node).toBe('A');
		expect(swConns.main[1]![0].node).toBe('B');
	});

	it('skips null Switch case targets while keeping sibling cases anchored', () => {
		const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
		const sw = switchCase({ version: 3.2, config: { name: 'Route' } });
		const b = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'B' } });

		const json = workflow('id', 'Test').add(t).to(sw).onCase(0, null).onCase(1, b).toJSON();

		const swConns = json.connections.Route;
		expect(swConns.main[0]).toEqual([]);
		expect(swConns.main[1]![0].node).toBe('B');
	});

	it('throws a clear error when .onTrue() does not follow an IF node', () => {
		const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
		const set = node({ type: 'n8n-nodes-base.set', version: 3, config: { name: 'Set' } });
		const target = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'X' } });

		expect(() => workflow('id', 'Test').add(t).to(set).onTrue(target)).toThrow(/onTrue/);
	});
});
