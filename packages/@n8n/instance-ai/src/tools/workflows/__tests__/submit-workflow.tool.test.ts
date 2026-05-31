import { validateWorkflow, type WorkflowJSON } from '@n8n/workflow-sdk';
import { mock } from 'jest-mock-extended';
import type { INodeTypes, WorkflowStructureIssue } from 'n8n-workflow';

import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiContext } from '../../../types';
import type { SandboxWorkspace } from '../../../workspace/sandbox-fs';
import {
	buildErrorDetails,
	buildNodeIndex,
	classifySubmitFailure,
	extractStructureIssues,
	normalizeWorkflowNodeParameters,
	type SubmitWorkflowAttempt,
	type SubmitWorkflowOutput,
} from '../submit-workflow.tool';
import { isTriggerNodeType } from '../workflow-json-utils';

jest.mock('@n8n/workflow-sdk', () => ({
	validateWorkflow: jest.fn(() => ({ errors: [], warnings: [] })),
}));

const { createSubmitWorkflowTool } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../submit-workflow.tool') as typeof import('../submit-workflow.tool');

const mockedValidateWorkflow = jest.mocked(validateWorkflow);

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
function makeWorkspace(): SandboxWorkspace {
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
	};
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
): SandboxWorkspace {
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
	};
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

		const tool = createSubmitWorkflowTool(context, makeBuildSuccessWorkspace(), new Map());

		await executeTool(tool, { filePath: 'src/workflow.ts', name: 'Test' });

		expect(mockedValidateWorkflow).toHaveBeenCalledWith(expect.any(Object), {
			nodeTypesProvider,
			strictMode: true,
		});
	});

	it('passes undefined nodeTypesProvider when context has none, strictMode still on', async () => {
		const tool = createSubmitWorkflowTool(makeContext(), makeBuildSuccessWorkspace(), new Map());

		await executeTool(tool, { filePath: 'src/workflow.ts', name: 'Test' });

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
		);

		const out = await executeTool(tool, { filePath: 'src/workflow.ts', name: 'New workflow' });

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
		);

		const out = await executeTool(tool, { filePath: 'src/workflow.ts', workflowId: 'abc123' });

		expect(out.success).toBe(false);
		expect(out.errors).toEqual(['Action blocked by admin']);
		expect(attempts).toHaveLength(1);
		expect(attempts[0]).toMatchObject({
			success: false,
			errors: ['Action blocked by admin'],
		});
	});
});

describe('createSubmitWorkflowTool — successful submit metadata', () => {
	beforeEach(() => {
		mockedValidateWorkflow.mockReset();
		mockedValidateWorkflow.mockReturnValue({ errors: [], warnings: [] } as never);
	});

	it('uses the provided root for default file path and build cwd', async () => {
		const root = '/home/test/workspace/builders/builder-1';
		const calls: Array<{ command: string; cwd?: string }> = [];
		const workflowService = {
			createFromWorkflowJSON: jest.fn(async () => {
				await Promise.resolve();
				return { id: 'main-workflow-id' };
			}),
		};
		const workspace: SandboxWorkspace = {
			sandbox: {
				executeCommand: async (command: string, _args?: string[], options?: { cwd?: string }) => {
					await Promise.resolve();
					calls.push({ command, cwd: options?.cwd });
					if (command.startsWith('node --import tsx build.mjs')) {
						return {
							exitCode: 0,
							stdout: JSON.stringify({
								success: true,
								workflow: { id: 'wf-1', name: 'Test', nodes: [], connections: {} },
								warnings: [],
							}),
							stderr: '',
						};
					}
					return { exitCode: 0, stdout: '', stderr: '' };
				},
			},
		};
		const tool = createSubmitWorkflowTool(
			makeContext({} as InstanceAiContext['permissions'], {
				workflowService: workflowService as unknown as InstanceAiContext['workflowService'],
			}),
			workspace,
			new Map(),
			undefined,
			{ root },
		);

		await executeTool(tool, { name: 'Test' });

		expect(calls.some((call) => call.command === `cat '${root}/src/workflow.ts' 2>/dev/null`)).toBe(
			true,
		);
		expect(calls.find((call) => call.command.startsWith('node --import tsx build.mjs'))?.cwd).toBe(
			root,
		);
	});

	it('returns and reports workflow pin-data verification and referenced workflow IDs', async () => {
		const attempts: SubmitWorkflowAttempt[] = [];
		const workflowService = {
			createFromWorkflowJSON: jest.fn(async () => {
				await Promise.resolve();
				return { id: 'main-workflow-id' };
			}),
		};
		const workflowJson = {
			name: 'Main workflow',
			nodes: [
				{
					id: 'node-1',
					name: 'Slack',
					type: 'n8n-nodes-base.slack',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
					credentials: { slackApi: null },
				},
				{
					id: 'node-2',
					name: 'Call Sub',
					type: 'n8n-nodes-base.executeWorkflow',
					typeVersion: 1,
					position: [200, 0],
					parameters: {
						source: 'database',
						workflowId: 'sub-workflow-id',
					},
				},
			],
			connections: {},
			pinData: {
				Slack: [{ ok: true }],
			},
		};
		const tool = createSubmitWorkflowTool(
			makeContext({} as InstanceAiContext['permissions'], {
				workflowService: workflowService as unknown as InstanceAiContext['workflowService'],
			}),
			makeBuildSuccessWorkspace(workflowJson),
			new Map(),
			(attempt) => {
				attempts.push(attempt);
			},
		);

		const output = await executeTool<SubmitWorkflowOutput>(tool, {
			filePath: 'src/workflow.ts',
			name: 'Main workflow',
		});

		expect(output).toMatchObject({
			success: true,
			workflowId: 'main-workflow-id',
			usesWorkflowPinDataForVerification: true,
			referencedWorkflowIds: ['sub-workflow-id'],
		});
		expect(attempts).toHaveLength(1);
		expect(attempts[0]).toMatchObject({
			success: true,
			workflowId: 'main-workflow-id',
			usesWorkflowPinDataForVerification: true,
			referencedWorkflowIds: ['sub-workflow-id'],
		});
	});
});

describe('classifySubmitFailure', () => {
	it('treats structural workflow save validation failures as code-fixable', () => {
		const remediation = classifySubmitFailure(
			[
				'Workflow save failed: Workflow structure is invalid. nodes[0].parameters (invalid_type): Expected object, received null',
			],
			'workflow_save_failed',
		);

		expect(remediation).toMatchObject({
			category: 'code_fixable',
			shouldEdit: true,
			reason: 'workflow_save_failed',
		});
		expect(remediation.guidance).toContain('Fix the workflow code');
	});

	it('treats workflow save failures as terminal blockers', () => {
		const remediation = classifySubmitFailure(
			['Workflow save failed: database unavailable'],
			'workflow_save_failed',
		);

		expect(remediation).toMatchObject({
			category: 'blocked',
			shouldEdit: false,
			reason: 'workflow_save_failed',
		});
		expect(remediation.guidance).toContain('Stop editing');
	});

	it('treats a not-found workflowId as code-fixable so the agent can drop the id', () => {
		const remediation = classifySubmitFailure(
			['Workflow save failed: Workflow not found'],
			'workflow_save_failed',
		);

		expect(remediation).toMatchObject({
			category: 'code_fixable',
			shouldEdit: true,
			reason: 'workflow_save_failed',
		});
		expect(remediation.guidance).toContain('Omit the workflowId');
	});

	it('routes missing or inaccessible credential save failures to setup', () => {
		const remediation = classifySubmitFailure(
			['Workflow save failed: Credential "slackApi" is not accessible'],
			'workflow_save_failed',
		);

		expect(remediation).toMatchObject({
			category: 'needs_setup',
			shouldEdit: false,
			reason: 'workflow_save_failed',
		});
		expect(remediation.guidance).toContain('credential setup');
	});
});

describe('extractStructureIssues', () => {
	it('returns the issues array when the error carries WorkflowStructureIssue[]', () => {
		const caused = Object.assign(new Error('boom'), {
			issues: [{ path: ['nodes', 0, 'parameters'], code: 'invalid_type', message: 'no good' }],
		});
		const result = extractStructureIssues(caused);
		expect(result).toHaveLength(1);
		expect(result?.[0].path).toEqual(['nodes', 0, 'parameters']);
	});

	it('returns undefined for a plain Error without issues', () => {
		expect(extractStructureIssues(new Error('plain'))).toBeUndefined();
	});

	it('returns undefined when issues is an empty array', () => {
		const caused = Object.assign(new Error('x'), { issues: [] });
		expect(extractStructureIssues(caused)).toBeUndefined();
	});

	it('returns undefined when issue entries have wrong shape', () => {
		const caused = Object.assign(new Error('x'), {
			issues: [{ path: 'nope', message: 'wrong shape' }],
		});
		expect(extractStructureIssues(caused)).toBeUndefined();
	});

	it('returns undefined for non-objects', () => {
		expect(extractStructureIssues(null)).toBeUndefined();
		expect(extractStructureIssues(undefined)).toBeUndefined();
		expect(extractStructureIssues('error')).toBeUndefined();
	});
});

describe('buildNodeIndex', () => {
	it('returns one entry per node with stable index ordering', () => {
		const json = {
			nodes: [
				{ name: 'Gmail Trigger', type: 'x', position: [0, 0], parameters: {} },
				{ name: 'Route', type: 'y', position: [0, 0], parameters: {} },
				{ name: 'Manual Trigger (temp)', type: 'z', position: [0, 0], parameters: {} },
			],
			connections: {},
		} as unknown as WorkflowJSON;

		expect(buildNodeIndex(json)).toEqual([
			{ index: 0, name: 'Gmail Trigger' },
			{ index: 1, name: 'Route' },
			{ index: 2, name: 'Manual Trigger (temp)' },
		]);
	});

	it('returns an empty array when nodes is missing', () => {
		expect(buildNodeIndex({ connections: {} } as unknown as WorkflowJSON)).toEqual([]);
	});
});

describe('buildErrorDetails', () => {
	const json = {
		name: 'Test',
		nodes: [
			{
				id: 'n-0',
				name: 'Gmail Trigger',
				type: 'n8n-nodes-base.gmailTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: { foo: 'bar' },
			},
			{
				id: 'n-1',
				name: 'Manual Trigger (temp)',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 200],
				parameters: null,
			},
		],
		connections: {
			'Gmail Trigger': { main: [[{ node: 'GhostNode', type: 'main', index: 0 }]] },
		},
	} as unknown as WorkflowJSON;

	it('attaches nodeJson when the path starts with nodes[N]', () => {
		const issues: WorkflowStructureIssue[] = [
			{
				path: ['nodes', 1, 'parameters'],
				code: 'invalid_type',
				message: 'Expected object, received null',
			} as WorkflowStructureIssue,
		];

		const [detail] = buildErrorDetails(issues, json);

		expect(detail.path).toBe('nodes[1].parameters');
		expect(detail.code).toBe('invalid_type');
		expect(detail.offendingValue).toBeNull();
		expect(detail.nodeJson).toEqual(json.nodes[1]);
		expect(detail.connectionSlice).toBeUndefined();
	});

	it('attaches connectionSlice when the path starts with connections.<sourceName>', () => {
		const issues: WorkflowStructureIssue[] = [
			{
				path: ['connections', 'Gmail Trigger', 'main', 0, 0, 'node'],
				code: 'unknown_connection_target',
				message: 'Connection target "GhostNode" does not reference an existing node',
			},
		];

		const [detail] = buildErrorDetails(issues, json);

		expect(detail.path).toBe('connections.Gmail Trigger.main[0][0].node');
		expect(detail.offendingValue).toBe('GhostNode');
		expect(detail.connectionSlice).toEqual(json.connections['Gmail Trigger']);
		expect(detail.nodeJson).toBeUndefined();
	});

	it('attaches neither slice for workflow-level paths and keeps offendingValue', () => {
		const issues: WorkflowStructureIssue[] = [
			{
				path: ['name'],
				code: 'invalid_type',
				message: 'Required',
			} as WorkflowStructureIssue,
		];

		const [detail] = buildErrorDetails(issues, json);
		expect(detail.path).toBe('name');
		expect(detail.code).toBe('invalid_type');
		expect(detail.offendingValue).toBe('Test');
		expect(detail.nodeJson).toBeUndefined();
		expect(detail.connectionSlice).toBeUndefined();
	});

	it('uses "workflow" as the path label for root-level issues', () => {
		const issues: WorkflowStructureIssue[] = [
			{
				path: [],
				code: 'invalid_type',
				message: 'root payload bad',
			} as unknown as WorkflowStructureIssue,
		];

		const [detail] = buildErrorDetails(issues, json);
		expect(detail.path).toBe('workflow');
	});
});

describe('createSubmitWorkflowTool — structured save-failure payload', () => {
	beforeEach(() => {
		mockedValidateWorkflow.mockReset();
		mockedValidateWorkflow.mockReturnValue({ errors: [], warnings: [] } as never);
	});

	it('returns errorDetails and nodeIndex when the save throws a structured error', async () => {
		// Mimic WorkflowStructureBadRequestError from packages/cli/src/workflow-helpers.ts:
		// a regular Error with an `issues` property. Use `position` (not `parameters`)
		// because `normalizeWorkflowNodeParameters` runs before save and would coerce
		// a `null` parameters value to `{}` — invalidating any assertion about it.
		const saveError = Object.assign(
			new Error(
				'Workflow structure is invalid. nodes[1].position (invalid_type): Expected tuple, received null',
			),
			{
				issues: [
					{
						path: ['nodes', 1, 'position'],
						code: 'invalid_type',
						message: 'Expected tuple, received null',
					},
				],
			},
		);

		const workflowJson = {
			name: 'Triage workflow',
			nodes: [
				{
					id: 'n-0',
					name: 'Gmail Trigger',
					type: 'n8n-nodes-base.gmailTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'n-1',
					name: 'Manual Trigger (temp)',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: null,
					parameters: {},
				},
			],
			connections: {},
		};

		const workflowService = {
			createFromWorkflowJSON: jest.fn(async () => {
				await Promise.resolve();
				throw saveError;
			}),
		};

		const attempts: SubmitWorkflowAttempt[] = [];
		const tool = createSubmitWorkflowTool(
			makeContext({} as InstanceAiContext['permissions'], {
				workflowService: workflowService as unknown as InstanceAiContext['workflowService'],
			}),
			makeBuildSuccessWorkspace(workflowJson),
			new Map(),
			(attempt) => {
				attempts.push(attempt);
			},
		);

		const output = await executeTool<SubmitWorkflowOutput>(tool, {
			filePath: 'src/workflow.ts',
			name: 'Triage workflow',
		});

		expect(output.success).toBe(false);
		expect(output.errors?.[0]).toContain('nodes[1].position');
		expect(output.errorDetails).toHaveLength(1);
		expect(output.errorDetails?.[0]).toMatchObject({
			path: 'nodes[1].position',
			code: 'invalid_type',
			message: 'Expected tuple, received null',
			offendingValue: null,
		});
		expect(output.errorDetails?.[0].nodeJson).toMatchObject({
			name: 'Manual Trigger (temp)',
			type: 'n8n-nodes-base.manualTrigger',
		});
		expect(output.nodeIndex).toEqual([
			{ index: 0, name: 'Gmail Trigger' },
			{ index: 1, name: 'Manual Trigger (temp)' },
		]);

		expect(attempts).toHaveLength(1);
		expect(attempts[0].errorDetails?.[0].path).toBe('nodes[1].position');
		expect(attempts[0].nodeIndex).toHaveLength(2);
	});

	it('still emits nodeIndex (but no errorDetails) when the save error is plain', async () => {
		const workflowService = {
			createFromWorkflowJSON: jest.fn(async () => {
				await Promise.resolve();
				throw new Error('database unavailable');
			}),
		};

		const workflowJson = {
			name: 'Plain failure',
			nodes: [
				{
					id: 'n-0',
					name: 'A',
					type: 'n8n-nodes-base.set',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
		};

		const tool = createSubmitWorkflowTool(
			makeContext({} as InstanceAiContext['permissions'], {
				workflowService: workflowService as unknown as InstanceAiContext['workflowService'],
			}),
			makeBuildSuccessWorkspace(workflowJson),
			new Map(),
		);

		const output = await executeTool<SubmitWorkflowOutput>(tool, {
			filePath: 'src/workflow.ts',
			name: 'Plain failure',
		});

		expect(output.success).toBe(false);
		expect(output.errorDetails).toBeUndefined();
		expect(output.nodeIndex).toEqual([{ index: 0, name: 'A' }]);
	});
});

describe('normalizeWorkflowNodeParameters', () => {
	it('normalizes missing and null node parameters to empty objects', () => {
		const workflow = {
			id: 'wf-1',
			name: 'Test',
			nodes: [
				{
					id: 'node-1',
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: null,
				},
				{
					id: 'node-2',
					name: 'Set',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [200, 0],
				},
			],
			connections: {},
		} as unknown as WorkflowJSON;

		normalizeWorkflowNodeParameters(workflow);

		expect(workflow.nodes.map((node) => node.parameters)).toEqual([{}, {}]);
	});
});
