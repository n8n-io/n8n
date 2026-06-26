import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';
import type { INode } from 'n8n-workflow';
import { Workflow } from 'n8n-workflow';

import type { NodeTypes } from '@/node-types';

export const logger = mock<Logger>();
logger.scoped.mockReturnValue(logger);

const description = { properties: [] };

export function node(id: string, type: string, overrides: Partial<INode> = {}): INode {
	return {
		id,
		name: id,
		type,
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		...overrides,
	};
}

export function createNodeTypes() {
	const nodeTypes = mock<NodeTypes>();
	nodeTypes.getByNameAndVersion.mockImplementation((type: string) => {
		if (type === 'trigger') {
			return { description: { ...description, name: 'trigger' }, trigger: vi.fn() } as never;
		}
		if (type === 'manual') {
			return {
				description: { ...description, name: 'manualTrigger' },
				trigger: vi.fn(),
			} as never;
		}
		if (type === 'execute-workflow') {
			return {
				description: { ...description, name: 'executeWorkflowTrigger' },
				trigger: vi.fn(),
			} as never;
		}
		if (type === 'poll') {
			return { description: { ...description, name: 'poll' }, poll: vi.fn() } as never;
		}
		if (type === 'webhook') {
			return { description: { ...description, name: 'webhook' }, webhook: vi.fn() } as never;
		}

		return { description: { ...description, name: type } } as never;
	});
	return nodeTypes;
}

export function createWorkflow(nodes: INode[], nodeTypes = createNodeTypes()) {
	return new Workflow({
		id: 'wf-1',
		name: 'Test workflow',
		nodes,
		connections: {},
		active: true,
		nodeTypes,
		staticData: {},
		settings: {},
	});
}
