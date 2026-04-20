import type { Workspace } from '@mastra/core/workspace';

import type { InstanceAiContext } from '../../../types';

jest.mock('@mastra/core/tools', () => ({
	createTool: jest.fn((config: Record<string, unknown>) => config),
}));

const { createSubmitWorkflowTool } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../submit-workflow.tool') as typeof import('../submit-workflow.tool');

type Executable = {
	execute: (input: Record<string, unknown>) => Promise<{
		success: boolean;
		errors?: string[];
	}>;
};

function makeContext(
	permissions: InstanceAiContext['permissions'] = {} as InstanceAiContext['permissions'],
): InstanceAiContext {
	return {
		permissions,
		workflowService: {} as InstanceAiContext['workflowService'],
	} as unknown as InstanceAiContext;
}

const workspace = {} as Workspace;

describe('createSubmitWorkflowTool — permission enforcement', () => {
	it('rejects create when createWorkflow is blocked', async () => {
		const tool = createSubmitWorkflowTool(
			makeContext({ createWorkflow: 'blocked' } as InstanceAiContext['permissions']),
			workspace,
		) as unknown as Executable;

		const out = await tool.execute({ name: 'New workflow' });

		expect(out.success).toBe(false);
		expect(out.errors).toEqual(['Action blocked by admin']);
	});

	it('rejects update when updateWorkflow is blocked', async () => {
		const tool = createSubmitWorkflowTool(
			makeContext({ updateWorkflow: 'blocked' } as InstanceAiContext['permissions']),
			workspace,
		) as unknown as Executable;

		const out = await tool.execute({ workflowId: 'abc123' });

		expect(out.success).toBe(false);
		expect(out.errors).toEqual(['Action blocked by admin']);
	});
});
