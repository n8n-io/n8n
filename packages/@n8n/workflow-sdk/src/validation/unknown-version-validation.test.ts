import type { INodeType, INodeTypes } from 'n8n-workflow';
import { NodeVersionNotFoundError } from 'n8n-workflow';

import { validateWorkflow } from '../validation';
import { workflow } from '../workflow-builder';
import { node, trigger } from '../workflow-builder/node-builders/node-builder';

// A provider that only knows n8n-nodes-base.httpRequest at versions 1-4. Any
// other version throws NodeVersionNotFoundError, mirroring the real registry.
const mockNodeTypesProvider: INodeTypes = {
	getByNameAndVersion: (type: string, version?: number): INodeType => {
		if (type === 'n8n-nodes-base.manualTrigger') {
			return { description: { inputs: [], outputs: ['main'] } } as unknown as INodeType;
		}
		if (type === 'n8n-nodes-base.httpRequest') {
			if (version !== undefined && ![1, 2, 3, 4].includes(version)) {
				throw new NodeVersionNotFoundError(type, version, [1, 2, 3, 4]);
			}
			return { description: { inputs: ['main'], outputs: ['main'] } } as unknown as INodeType;
		}
		return { description: { inputs: ['main'], outputs: ['main'] } } as unknown as INodeType;
	},
	getByName: (type: string) => mockNodeTypesProvider.getByNameAndVersion(type),
	getKnownTypes: () => ({}),
} as INodeTypes;

describe('unknown node version validation', () => {
	it('does not throw and reports an UNKNOWN_NODE_VERSION warning for a bad version', () => {
		const myTrigger = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
		const http = node({ type: 'n8n-nodes-base.httpRequest', version: 4.4, config: {} });

		const wf = workflow('test-id', 'Test').add(myTrigger.to(http));

		let result!: ReturnType<typeof validateWorkflow>;
		expect(() => {
			result = validateWorkflow(wf, { nodeTypesProvider: mockNodeTypesProvider });
		}).not.toThrow();

		const versionWarning = result.warnings.find((w) => w.code === 'UNKNOWN_NODE_VERSION');
		expect(versionWarning).toBeDefined();
		expect(versionWarning?.message).toContain('is not available in version 4.4');
		expect(versionWarning?.message).toContain('Available versions: 1, 2, 3, 4');
		expect(versionWarning?.message).toContain('Use the latest version 4.');
		expect(versionWarning?.violationLevel).toBe('major');
	});

	it('does not warn for a valid version', () => {
		const myTrigger = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
		const http = node({ type: 'n8n-nodes-base.httpRequest', version: 4, config: {} });

		const wf = workflow('test-id', 'Test').add(myTrigger.to(http));

		const result = validateWorkflow(wf, { nodeTypesProvider: mockNodeTypesProvider });

		expect(result.warnings.filter((w) => w.code === 'UNKNOWN_NODE_VERSION')).toHaveLength(0);
	});

	it('lets non-version resolution errors propagate', () => {
		const throwingProvider: INodeTypes = {
			getByNameAndVersion: () => {
				throw new Error('Unrecognized node type: n8n-nodes-base.doesNotExist');
			},
			getByName: () => {
				throw new Error('Unrecognized node type: n8n-nodes-base.doesNotExist');
			},
			getKnownTypes: () => ({}),
		} as INodeTypes;

		const myTrigger = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
		const unknown = node({ type: 'n8n-nodes-base.doesNotExist', version: 1, config: {} });
		const wf = workflow('test-id', 'Test').add(myTrigger.to(unknown));

		expect(() => validateWorkflow(wf, { nodeTypesProvider: throwingProvider })).toThrow(
			'Unrecognized node type',
		);
	});
});
