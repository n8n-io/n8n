import type { INodeType, INodeTypes } from 'n8n-workflow';
import { NodeVersionNotFoundError } from 'n8n-workflow';

import { validateWorkflow } from '../validation';
import { workflow } from '../workflow-builder';
import { node, trigger } from '../workflow-builder/node-builders/node-builder';

// A provider where only `n8n-nodes-base.function` is retired.
const mockNodeTypesProvider: INodeTypes = {
	getByNameAndVersion: (type: string): INodeType =>
		({
			description: {
				inputs: ['main'],
				outputs: ['main'],
				...(type === 'n8n-nodes-base.function' ? { hidden: true } : {}),
			},
		}) as unknown as INodeType,
	getByName: (type: string) => mockNodeTypesProvider.getByNameAndVersion(type),
	getKnownTypes: () => ({}),
} as INodeTypes;

describe('deprecated node type validation', () => {
	it('reports a retired node type as informational, and keeps the workflow valid', () => {
		const myTrigger = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
		const legacy = node({
			type: 'n8n-nodes-base.function',
			version: 1,
			config: { name: 'Old Function' },
		});

		const wf = workflow('test-id', 'Test').add(myTrigger.to(legacy));

		const result = validateWorkflow(wf, { nodeTypesProvider: mockNodeTypesProvider });

		const warning = result.warnings.find((w) => w.code === 'DEPRECATED_NODE_TYPE');
		expect(warning).toBeDefined();
		expect(warning?.nodeName).toBe('Old Function');
		expect(warning?.message).toContain("'n8n-nodes-base.function'");
		expect(warning?.message).toContain('retired');
		// The node stays usable: a soft warning must not block a save.
		expect(warning?.severity).toBe('informational');
		expect(result.valid).toBe(true);
	});

	it('does not warn for a node type that is still supported', () => {
		const myTrigger = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
		const http = node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: {} });

		const wf = workflow('test-id', 'Test').add(myTrigger.to(http));

		const result = validateWorkflow(wf, { nodeTypesProvider: mockNodeTypesProvider });

		expect(result.warnings.filter((w) => w.code === 'DEPRECATED_NODE_TYPE')).toHaveLength(0);
	});

	it('warns once for each node that uses the retired type', () => {
		const myTrigger = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
		const first = node({
			type: 'n8n-nodes-base.function',
			version: 1,
			config: { name: 'First' },
		});
		const second = node({
			type: 'n8n-nodes-base.function',
			version: 1,
			config: { name: 'Second' },
		});

		const wf = workflow('test-id', 'Test').add(myTrigger.to(first).to(second));

		const result = validateWorkflow(wf, { nodeTypesProvider: mockNodeTypesProvider });

		const warnings = result.warnings.filter((w) => w.code === 'DEPRECATED_NODE_TYPE');
		expect(warnings.map((w) => w.nodeName)).toEqual(['First', 'Second']);
	});

	it('does not warn when no node types provider is given', () => {
		const myTrigger = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
		const legacy = node({ type: 'n8n-nodes-base.function', version: 1, config: {} });

		const wf = workflow('test-id', 'Test').add(myTrigger.to(legacy));

		const result = validateWorkflow(wf);

		expect(result.warnings.filter((w) => w.code === 'DEPRECATED_NODE_TYPE')).toHaveLength(0);
	});

	it('stays quiet when the node cannot be resolved at the requested version', () => {
		const versionThrowingProvider: INodeTypes = {
			getByNameAndVersion: (type: string, version?: number): INodeType => {
				if (type === 'n8n-nodes-base.function' && version === 9) {
					throw new NodeVersionNotFoundError(type, version, [1]);
				}
				return mockNodeTypesProvider.getByNameAndVersion(type, version);
			},
			getByName: (type: string) => mockNodeTypesProvider.getByNameAndVersion(type),
			getKnownTypes: () => ({}),
		} as INodeTypes;

		const myTrigger = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
		const legacy = node({ type: 'n8n-nodes-base.function', version: 9, config: {} });

		const wf = workflow('test-id', 'Test').add(myTrigger.to(legacy));

		let result!: ReturnType<typeof validateWorkflow>;
		expect(() => {
			result = validateWorkflow(wf, { nodeTypesProvider: versionThrowingProvider });
		}).not.toThrow();

		// The unknown version is its own warning; do not guess at deprecation too.
		expect(result.warnings.filter((w) => w.code === 'DEPRECATED_NODE_TYPE')).toHaveLength(0);
		expect(result.warnings.some((w) => w.code === 'UNKNOWN_NODE_VERSION')).toBe(true);
	});
});
