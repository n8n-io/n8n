import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';
import type { IConnections, INode } from 'n8n-workflow';
import { mapConnectionsByDestination } from 'n8n-workflow';

import { NodeHasDirectParentCheck } from '../checks/node-has-direct-parent.check';
import type { WorkflowCheckContext } from '../workflow-authoring-checks.types';

const logger = mock<Logger>();

const makeCtx = (nodes: INode[], connections: IConnections): WorkflowCheckContext => ({
	workflowId: 'wf-1',
	nodes,
	connections,
	connectionsByDestination: mapConnectionsByDestination(connections),
	settings: undefined,
	logger,
});

const CHILD = 'my.child';
const PARENT = 'my.parent';

const makeNode = (overrides: Partial<INode> & Pick<INode, 'id' | 'name' | 'type'>): INode => ({
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
	...overrides,
});

describe('NodeHasDirectParentCheck', () => {
	const check = new NodeHasDirectParentCheck();
	const config = { childNodeType: CHILD, parentNodeType: PARENT };

	it('has expected metadata', () => {
		expect(check.type).toBe('node-has-direct-parent');
		expect(check.defaultSeverity).toBe('warning');
		expect(check.configSchema.fields).toHaveLength(2);
	});

	describe('validateConfig', () => {
		it('accepts a well-formed config', () => {
			expect(check.validateConfig(config)).toEqual(config);
		});

		it('rejects non-object configs', () => {
			expect(() => check.validateConfig(null)).toThrow(/must be an object/);
			expect(() => check.validateConfig('x')).toThrow(/must be an object/);
		});

		it('rejects missing childNodeType', () => {
			expect(() => check.validateConfig({ parentNodeType: PARENT })).toThrow(
				/childNodeType must be a non-empty string/,
			);
		});

		it('rejects missing parentNodeType', () => {
			expect(() => check.validateConfig({ childNodeType: CHILD })).toThrow(
				/parentNodeType must be a non-empty string/,
			);
		});
	});

	describe('evaluate', () => {
		it('returns no violations when there are no child nodes', async () => {
			const ctx = makeCtx([], {});

			expect(await check.evaluate(ctx, config)).toEqual([]);
		});

		it('returns a violation when a child has no parent at all', async () => {
			const child = makeNode({ id: 'c1', name: 'Child', type: CHILD });
			const ctx = makeCtx([child], {});

			const violations = await check.evaluate(ctx, config);

			expect(violations).toHaveLength(1);
			expect(violations[0]).toMatchObject({
				nodeIds: ['c1'],
			});
		});

		it('returns no violations when a parent of the right type is directly connected', async () => {
			const child = makeNode({ id: 'c1', name: 'Child', type: CHILD });
			const parent = makeNode({ id: 'p1', name: 'Parent', type: PARENT });
			const connections: IConnections = {
				Parent: { main: [[{ node: 'Child', type: 'main', index: 0 }]] },
			};

			const ctx = makeCtx([parent, child], connections);

			expect(await check.evaluate(ctx, config)).toEqual([]);
		});

		it('reports a violation when the only parent is the wrong type', async () => {
			const child = makeNode({ id: 'c1', name: 'Child', type: CHILD });
			const other = makeNode({ id: 'o1', name: 'Other', type: 'some.other' });
			const connections: IConnections = {
				Other: { main: [[{ node: 'Child', type: 'main', index: 0 }]] },
			};

			const ctx = makeCtx([other, child], connections);

			expect(await check.evaluate(ctx, config)).toHaveLength(1);
		});

		it('ignores disabled child nodes', async () => {
			const child = makeNode({ id: 'c1', name: 'Child', type: CHILD, disabled: true });
			const ctx = makeCtx([child], {});

			expect(await check.evaluate(ctx, config)).toEqual([]);
		});

		it('ignores disabled parent nodes', async () => {
			const child = makeNode({ id: 'c1', name: 'Child', type: CHILD });
			const parent = makeNode({
				id: 'p1',
				name: 'Parent',
				type: PARENT,
				disabled: true,
			});
			const connections: IConnections = {
				Parent: { main: [[{ node: 'Child', type: 'main', index: 0 }]] },
			};

			const ctx = makeCtx([parent, child], connections);

			expect(await check.evaluate(ctx, config)).toHaveLength(1);
		});

		it('validates the raw config before evaluating', async () => {
			const ctx = makeCtx([], {});

			await expect(check.evaluate(ctx, null)).rejects.toThrow(/must be an object/);
		});
	});
});
