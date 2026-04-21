import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';
import type { IConnections, INode, INodeTypeDescription } from 'n8n-workflow';
import { mapConnectionsByDestination } from 'n8n-workflow';

import type { NodeTypes } from '@/node-types';

import { NoDanglingNodesCheck } from '../checks/no-dangling-nodes.check';
import type { WorkflowCheckContext } from '../workflow-authoring-checks.types';

const logger = mock<Logger>();

const TRIGGER = 'trigger.type';
const NODE = 'action.type';

const makeNode = (overrides: Partial<INode> & Pick<INode, 'id' | 'name' | 'type'>): INode => ({
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
	...overrides,
});

const description = (overrides: Partial<INodeTypeDescription>) =>
	({
		group: [],
		...overrides,
	}) as INodeTypeDescription;

function buildCheck(triggerTypes: string[] = [TRIGGER]): NoDanglingNodesCheck {
	const nodeTypes = mock<NodeTypes>();
	nodeTypes.getByNameAndVersion.mockImplementation(
		(type: string) =>
			({
				description: description({
					group: triggerTypes.includes(type) ? ['trigger'] : ['transform'],
				}),
			}) as ReturnType<NodeTypes['getByNameAndVersion']>,
	);
	return new NoDanglingNodesCheck(nodeTypes);
}

const makeCtx = (nodes: INode[], connections: IConnections): WorkflowCheckContext => ({
	workflowId: 'wf-1',
	nodes,
	connections,
	connectionsByDestination: mapConnectionsByDestination(connections),
	settings: undefined,
	logger,
});

describe('NoDanglingNodesCheck', () => {
	it('has expected metadata', () => {
		const check = buildCheck();
		expect(check.type).toBe('no-dangling-nodes');
		expect(check.static).toBe(true);
		expect(check.defaultSeverity).toBe('warning');
		expect(check.configSchema.fields).toHaveLength(0);
	});

	it('returns no violations when every non-trigger node is downstream of a trigger', async () => {
		const check = buildCheck();
		const trigger = makeNode({ id: 't1', name: 'Trigger', type: TRIGGER });
		const action = makeNode({ id: 'a1', name: 'Action', type: NODE });
		const connections: IConnections = {
			Trigger: { main: [[{ node: 'Action', type: 'main', index: 0 }]] },
		};

		const violations = await check.evaluate(makeCtx([trigger, action], connections));

		expect(violations).toEqual([]);
	});

	it('flags a node that has no path back to any trigger', async () => {
		const check = buildCheck();
		const trigger = makeNode({ id: 't1', name: 'Trigger', type: TRIGGER });
		const orphan = makeNode({ id: 'o1', name: 'Orphan', type: NODE });

		const violations = await check.evaluate(makeCtx([trigger, orphan], {}));

		expect(violations).toHaveLength(1);
		expect(violations[0]).toMatchObject({ nodeIds: ['o1'] });
	});

	it('flags every node in a dangling chain', async () => {
		const check = buildCheck();
		const trigger = makeNode({ id: 't1', name: 'Trigger', type: TRIGGER });
		const a = makeNode({ id: 'a1', name: 'A', type: NODE });
		const b = makeNode({ id: 'b1', name: 'B', type: NODE });
		const connections: IConnections = {
			A: { main: [[{ node: 'B', type: 'main', index: 0 }]] },
		};

		const violations = await check.evaluate(makeCtx([trigger, a, b], connections));

		expect(violations).toHaveLength(2);
		expect(violations.map((v) => v.nodeIds?.[0]).sort()).toEqual(['a1', 'b1']);
	});

	it('skips disabled non-trigger nodes even when they are dangling', async () => {
		const check = buildCheck();
		const trigger = makeNode({ id: 't1', name: 'Trigger', type: TRIGGER });
		const orphan = makeNode({ id: 'o1', name: 'Orphan', type: NODE, disabled: true });

		const violations = await check.evaluate(makeCtx([trigger, orphan], {}));

		expect(violations).toEqual([]);
	});

	it('ignores disabled triggers when computing reachability', async () => {
		const check = buildCheck();
		const trigger = makeNode({ id: 't1', name: 'Trigger', type: TRIGGER, disabled: true });
		const action = makeNode({ id: 'a1', name: 'Action', type: NODE });
		const connections: IConnections = {
			Trigger: { main: [[{ node: 'Action', type: 'main', index: 0 }]] },
		};

		const violations = await check.evaluate(makeCtx([trigger, action], connections));

		expect(violations).toHaveLength(1);
		expect(violations[0]).toMatchObject({ nodeIds: ['a1'] });
	});

	it('returns no violations when there are no enabled triggers', async () => {
		const check = buildCheck();
		const action = makeNode({ id: 'a1', name: 'Action', type: NODE });

		const violations = await check.evaluate(makeCtx([action], {}));

		expect(violations).toEqual([]);
	});

	it('treats node as reachable if any enabled trigger reaches it', async () => {
		const check = buildCheck([TRIGGER, 'other.trigger']);
		const triggerA = makeNode({ id: 't1', name: 'TriggerA', type: TRIGGER });
		const triggerB = makeNode({ id: 't2', name: 'TriggerB', type: 'other.trigger' });
		const action = makeNode({ id: 'a1', name: 'Action', type: NODE });
		const connections: IConnections = {
			TriggerB: { main: [[{ node: 'Action', type: 'main', index: 0 }]] },
		};

		const violations = await check.evaluate(makeCtx([triggerA, triggerB, action], connections));

		expect(violations).toEqual([]);
	});

	it('treats unknown node types as non-triggers', async () => {
		const nodeTypes = mock<NodeTypes>();
		nodeTypes.getByNameAndVersion.mockImplementation(() => {
			throw new Error('Unknown node type');
		});
		const check = new NoDanglingNodesCheck(nodeTypes);
		const orphan = makeNode({ id: 'o1', name: 'Orphan', type: 'mystery.type' });

		const violations = await check.evaluate(makeCtx([orphan], {}));

		expect(violations).toEqual([]);
	});
});
