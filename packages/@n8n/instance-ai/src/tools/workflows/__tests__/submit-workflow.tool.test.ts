import type { Workspace } from '@mastra/core/workspace';
import { validateWorkflow } from '@n8n/workflow-sdk';
import { mock } from 'jest-mock-extended';
import type { INodeTypes } from 'n8n-workflow';

import type { InstanceAiContext } from '../../../types';
import { isTriggerNodeType, type SubmitWorkflowAttempt } from '../submit-workflow.tool';

jest.mock('@mastra/core/tools', () => ({
	createTool: jest.fn((config: Record<string, unknown>) => config),
}));

jest.mock('@n8n/workflow-sdk', () => ({
	validateWorkflow: jest.fn(() => ({ errors: [], warnings: [] })),
	layoutWorkflowJSON: jest.fn((wf: unknown) => wf),
}));

// `require` (rather than `import`) is needed because `submit-workflow.tool`
// transitively pulls in @mastra/core (ESM-only); the require call here runs
// AFTER the `jest.mock('@mastra/core/tools', …)` above, so the mock is in
// place before the module is evaluated.
const { createSubmitWorkflowTool } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../submit-workflow.tool') as typeof import('../submit-workflow.tool');

const mockedValidateWorkflow = jest.mocked(validateWorkflow);

type Executable = {
	execute: (input: Record<string, unknown>) => Promise<{
		success: boolean;
		errors?: string[];
	}>;
};

function makeContext(
	permissions: InstanceAiContext['permissions'] = {} as InstanceAiContext['permissions'],
	overrides: Partial<InstanceAiContext> = {},
): InstanceAiContext {
	return {
		permissions,
		workflowService: {} as InstanceAiContext['workflowService'],
		...overrides,
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

/** Workspace stub that simulates a successful sandbox build by emitting
 *  parseable build.mjs output for the build command. */
function makeBuildSuccessWorkspace(
	workflowJson: object = {
		id: 'wf-1',
		name: 'Test',
		nodes: [],
		connections: {},
	},
): Workspace {
	return {
		sandbox: {
			executeCommand: async (command: string) => {
				await Promise.resolve();
				if (command === 'echo $HOME') {
					return { exitCode: 0, stdout: '/home/test\n', stderr: '' };
				}
				if (command.startsWith('node --import tsx build.mjs')) {
					return {
						exitCode: 0,
						stdout: JSON.stringify({
							success: true,
							workflow: workflowJson,
							warnings: [],
						}),
						stderr: '',
					};
				}
				return { exitCode: 0, stdout: '', stderr: '' };
			},
		},
	} as unknown as Workspace;
}

describe('createSubmitWorkflowTool — schema validation wiring', () => {
	beforeEach(() => {
		mockedValidateWorkflow.mockReset();
		mockedValidateWorkflow.mockReturnValue({
			// One blocking error so we early-return before workflowService.create/update is called.
			errors: [{ code: 'INVALID_PARAM', message: 'forced for test', nodeName: 'X' }],
			warnings: [],
		} as never);
	});

	it('forwards context.nodeTypesProvider into validateWorkflow', async () => {
		const nodeTypesProvider = mock<INodeTypes>();
		const context = makeContext({} as InstanceAiContext['permissions'], {
			nodeTypesProvider,
		});

		const tool = createSubmitWorkflowTool(
			context,
			makeBuildSuccessWorkspace(),
			new Map(),
		) as unknown as Executable;

		await tool.execute({ filePath: 'src/workflow.ts', name: 'Test' });

		expect(mockedValidateWorkflow).toHaveBeenCalledWith(expect.any(Object), {
			nodeTypesProvider,
			strictMode: true,
		});
	});

	it('passes undefined nodeTypesProvider when context has none, strictMode still on', async () => {
		const tool = createSubmitWorkflowTool(
			makeContext(),
			makeBuildSuccessWorkspace(),
			new Map(),
		) as unknown as Executable;

		await tool.execute({ filePath: 'src/workflow.ts', name: 'Test' });

		expect(mockedValidateWorkflow).toHaveBeenCalledWith(expect.any(Object), {
			nodeTypesProvider: undefined,
			strictMode: true,
		});
	});
});

describe('isTriggerNodeType', () => {
	it.each([
		'n8n-nodes-base.webhook',
		'n8n-nodes-base.formTrigger',
		'n8n-nodes-base.scheduleTrigger',
		'@n8n/n8n-nodes-langchain.chatTrigger',
	])('recognises known-mockable type %s', (type) => {
		expect(isTriggerNodeType(type)).toBe(true);
	});

	it.each([
		'n8n-nodes-base.emailReadImapTrigger',
		'@n8n/n8n-nodes-langchain.mcpTrigger',
		'n8n-nodes-base.manualTrigger',
		'customNamespace.someCustomtrigger',
	])('recognises suffix-matched trigger type %s', (type) => {
		expect(isTriggerNodeType(type)).toBe(true);
	});

	it.each(['n8n-nodes-base.slack', 'n8n-nodes-base.code', 'n8n-nodes-base.set', undefined, ''])(
		'returns false for non-trigger %s',
		(type) => {
			expect(isTriggerNodeType(type)).toBe(false);
		},
	);
});

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
