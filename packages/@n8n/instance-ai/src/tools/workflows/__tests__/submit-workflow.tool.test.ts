import type { Workspace } from '@mastra/core/workspace';

import type { InstanceAiContext } from '../../../types';
import type { SubmitWorkflowAttempt } from '../submit-workflow.tool';

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

/**
 * Minimal workspace stub that satisfies `getWorkspaceRoot` (`echo $HOME`) and
 * `readFileViaSandbox` (`cat ...`) — both run before the permission check so
 * the pre-check reportAttempt path gets a resolved filePath + sourceHash.
 */
function makeWorkspace(): Workspace {
	return {
		sandbox: {
			executeCommand: async (command: string) => {
				// await ensures the function is truly async (lint rule); no real I/O needed.
				await Promise.resolve();
				return command === 'echo $HOME'
					? { exitCode: 0, stdout: '/home/test\n', stderr: '' }
					: { exitCode: 0, stdout: '', stderr: '' };
			},
		},
	} as unknown as Workspace;
}

describe('createSubmitWorkflowTool — permission enforcement', () => {
	it('rejects create when createWorkflow is blocked and reports the attempt', async () => {
		const attempts: SubmitWorkflowAttempt[] = [];
		const tool = createSubmitWorkflowTool(
			makeContext({ createWorkflow: 'blocked' } as InstanceAiContext['permissions']),
			makeWorkspace(),
			new Map(),
			(attempt) => {
				attempts.push(attempt);
			},
		) as unknown as Executable;

		const out = await tool.execute({ filePath: 'src/workflow.ts', name: 'New workflow' });

		expect(out.success).toBe(false);
		expect(out.errors).toEqual(['Action blocked by admin']);
		expect(attempts).toHaveLength(1);
		expect(attempts[0].success).toBe(false);
		expect(attempts[0].errors).toEqual(['Action blocked by admin']);
		expect(attempts[0].filePath).toContain('workflow.ts');
	});

	it('rejects update when updateWorkflow is blocked and reports the attempt', async () => {
		const attempts: SubmitWorkflowAttempt[] = [];
		const tool = createSubmitWorkflowTool(
			makeContext({ updateWorkflow: 'blocked' } as InstanceAiContext['permissions']),
			makeWorkspace(),
			new Map(),
			(attempt) => {
				attempts.push(attempt);
			},
		) as unknown as Executable;

		const out = await tool.execute({ filePath: 'src/workflow.ts', workflowId: 'abc123' });

		expect(out.success).toBe(false);
		expect(out.errors).toEqual(['Action blocked by admin']);
		expect(attempts).toHaveLength(1);
		expect(attempts[0]).toMatchObject({
			success: false,
			errors: ['Action blocked by admin'],
		});
	});
});
