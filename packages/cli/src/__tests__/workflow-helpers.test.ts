import { MAX_PINNED_DATA_SIZE, MAX_WORKFLOW_SIZE, MAX_EXPECTED_REQUEST_SIZE } from '@n8n/api-types';
import { mockInstance } from '@n8n/backend-test-utils';
import type { CredentialsEntity, IExecutionResponse, Project, Variables } from '@n8n/db';
import { CredentialsRepository } from '@n8n/db';
import type {
	ExecutionError,
	IRun,
	ITaskData,
	IWorkflowBase,
	IWorkflowSettings,
	RelatedExecution,
} from 'n8n-workflow';

import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { OwnershipService } from '@/services/ownership.service';
import {
	getLastExecutedNodeData,
	getLastExecutedNodeRuns,
	getVariables,
	preserveInputOverride,
	removeDefaultValues,
	replaceInvalidCredentials,
	shouldRestartParentExecution,
	updateParentExecutionWithChildResults,
	validatePinDataSize,
	validateWorkflowNodeGroups,
	validateWorkflowStructure,
	WorkflowStructureBadRequestError,
} from '@/workflow-helpers';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { mock } from 'jest-mock-extended';

describe('workflow-helpers', () => {
	beforeAll(() => {
		mockInstance(VariablesService, {
			async getAllCached() {
				return [
					{ id: '1', key: 'VAR1', value: 'value1' },
					{ id: '2', key: 'VAR2', value: 'value2' },
					{
						id: '3',
						key: 'VAR2',
						value: 'value1Project',
						project: { id: '1', name: 'project1' } as Project,
					},
					{
						id: '4',
						key: 'VAR4',
						value: 'value4',
						project: { id: '1', name: 'project1' } as Project,
					},
					{
						id: '5',
						key: 'VAR5',
						value: 'value5',
						project: { id: '2', name: 'project2' } as Project,
					},
				] as Variables[];
			},
		});

		mockInstance(OwnershipService, {
			async getWorkflowProjectCached(_workflowId: string) {
				return { id: '1', name: 'project' } as unknown as Project;
			},
		});
	});

	describe('getVariables', () => {
		it('should return all variables as key-value pairs if no parameters are given', async () => {
			const variables = await getVariables();
			expect(variables).toEqual({ VAR1: 'value1', VAR2: 'value2' });
		});

		it('should return global and project variables if projectId is given', async () => {
			const variables = await getVariables(undefined, '1');
			expect(variables).toEqual({ VAR1: 'value1', VAR2: 'value1Project', VAR4: 'value4' });
		});

		it('should return global and project variables if workflowId is given', async () => {
			const variables = await getVariables('1');
			expect(variables).toEqual({ VAR1: 'value1', VAR2: 'value1Project', VAR4: 'value4' });
		});

		it('should prioritize passed of projectId over workflowId', async () => {
			const variables = await getVariables('1', '2');
			expect(variables).toEqual({ VAR1: 'value1', VAR2: 'value2', VAR5: 'value5' });
		});
	});
});

describe('shouldRestartParentExecution', () => {
	it('should return false when parentExecution is undefined', () => {
		expect(shouldRestartParentExecution(undefined)).toBe(false);
	});

	it('should return false when shouldResume is explicitly false', () => {
		const parentExecution = {
			executionId: 'parent-exec-id',
			workflowId: 'parent-workflow-id',
			shouldResume: false,
		};
		expect(shouldRestartParentExecution(parentExecution)).toBe(false);
	});

	it('should return true when shouldResume is undefined', () => {
		const parentExecution = {
			executionId: 'parent-exec-id',
			workflowId: 'parent-workflow-id',
			shouldResume: undefined,
		};
		expect(shouldRestartParentExecution(parentExecution)).toBe(true);
	});

	it('should return true when shouldResume is true', () => {
		const parentExecution = {
			executionId: 'parent-exec-id',
			workflowId: 'parent-workflow-id',
			shouldResume: true,
		};
		expect(shouldRestartParentExecution(parentExecution)).toBe(true);
	});
});

describe('preserveInputOverride', () => {
	const makeEntry = (overrides: Partial<ITaskData> = {}): ITaskData => ({
		startTime: 100,
		executionTime: 50,
		executionIndex: 1,
		source: [],
		...overrides,
	});

	it('should throw when the array is empty', () => {
		expect(() => preserveInputOverride([])).toThrow();
	});

	it('should pop the entry and leave the array empty when there is no inputOverride', () => {
		const runDataArray: ITaskData[] = [makeEntry()];
		preserveInputOverride(runDataArray);
		expect(runDataArray).toHaveLength(0);
	});

	it('should replace the entry with a zeroed placeholder when inputOverride is present', () => {
		const inputOverride = { main: [[{ json: { key: 'value' } }]] };
		const runDataArray: ITaskData[] = [makeEntry({ inputOverride })];
		preserveInputOverride(runDataArray);
		expect(runDataArray).toHaveLength(1);
		expect(runDataArray[0]).toEqual({
			startTime: 0,
			executionTime: 0,
			executionIndex: 0,
			source: [],
			inputOverride,
		});
	});

	it('should carry source from the original entry over to the placeholder', () => {
		const source = [{ previousNode: 'NodeA', previousNodeOutput: 0 }];
		const inputOverride = { main: [[{ json: {} }]] };
		const runDataArray: ITaskData[] = [makeEntry({ source, inputOverride })];
		preserveInputOverride(runDataArray);
		expect(runDataArray[0].source).toBe(source);
	});

	it('should not include data or other original fields in the placeholder', () => {
		const inputOverride = { main: [[{ json: {} }]] };
		const data = { main: [[{ json: { result: 'something' } }]] };
		const runDataArray: ITaskData[] = [makeEntry({ inputOverride, data, executionTime: 999 })];
		preserveInputOverride(runDataArray);
		expect(runDataArray[0]).not.toHaveProperty('data');
		expect(runDataArray[0].executionTime).toBe(0);
	});

	it('should only affect the last entry when inputOverride is present', () => {
		const inputOverride = { main: [[{ json: {} }]] };
		const first = makeEntry({ executionIndex: 0 });
		const second = makeEntry({ executionIndex: 1 });
		const last = makeEntry({ executionIndex: 2, inputOverride });
		const runDataArray: ITaskData[] = [first, second, last];
		preserveInputOverride(runDataArray);
		expect(runDataArray).toHaveLength(3);
		expect(runDataArray[0]).toBe(first);
		expect(runDataArray[1]).toBe(second);
		expect(runDataArray[2].inputOverride).toBe(inputOverride);
		expect(runDataArray[2].startTime).toBe(0);
	});

	it('should remove only the last entry when no inputOverride and earlier entries remain', () => {
		const first = makeEntry({ executionIndex: 0 });
		const runDataArray: ITaskData[] = [first, makeEntry({ executionIndex: 1 })];
		preserveInputOverride(runDataArray);
		expect(runDataArray).toHaveLength(1);
		expect(runDataArray[0]).toBe(first);
	});
});

describe('replaceInvalidCredentials', () => {
	const credentialsRepository = mockInstance(CredentialsRepository);

	afterEach(() => jest.clearAllMocks());

	function makeWorkflow(credentials: Record<string, { id: string | null; name: string }>) {
		return {
			nodes: [
				{
					id: 'node-1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					position: [0, 0] as [number, number],
					parameters: {},
					credentials,
				},
			],
			connections: {},
		} as unknown as IWorkflowBase;
	}

	it('should resolve credentials by name scoped to the given project', async () => {
		const cred = { id: 'cred-1', name: 'My Cred' } as CredentialsEntity;
		credentialsRepository.findByNameAndTypeInProject.mockResolvedValueOnce([cred]);

		const workflow = makeWorkflow({ httpHeaderAuth: { id: null, name: 'My Cred' } });
		await replaceInvalidCredentials(workflow, 'project-1');

		expect(credentialsRepository.findByNameAndTypeInProject).toHaveBeenCalledWith(
			'My Cred',
			'httpHeaderAuth',
			'project-1',
		);
		expect(workflow.nodes[0].credentials!.httpHeaderAuth).toEqual({
			id: 'cred-1',
			name: 'My Cred',
		});
	});

	it('should not resolve when no matching credential exists in the project', async () => {
		credentialsRepository.findByNameAndTypeInProject.mockResolvedValueOnce([]);

		const workflow = makeWorkflow({ httpHeaderAuth: { id: null, name: 'Unknown' } });
		await replaceInvalidCredentials(workflow, 'project-1');

		expect(workflow.nodes[0].credentials!.httpHeaderAuth).toEqual({
			id: null,
			name: 'Unknown',
		});
	});

	it('should not resolve when multiple credentials match in the project', async () => {
		const cred1 = { id: 'cred-1', name: 'Dup' } as CredentialsEntity;
		const cred2 = { id: 'cred-2', name: 'Dup' } as CredentialsEntity;
		credentialsRepository.findByNameAndTypeInProject.mockResolvedValueOnce([cred1, cred2]);

		const workflow = makeWorkflow({ httpHeaderAuth: { id: null, name: 'Dup' } });
		await replaceInvalidCredentials(workflow, 'project-1');

		expect(workflow.nodes[0].credentials!.httpHeaderAuth).toEqual({
			id: null,
			name: 'Dup',
		});
	});

	it('should fall back to name lookup within project when credential ID is not found', async () => {
		const cred = { id: 'cred-new', name: 'My Cred' } as CredentialsEntity;
		credentialsRepository.findOneBy.mockResolvedValueOnce(null);
		credentialsRepository.findByNameAndTypeInProject.mockResolvedValueOnce([cred]);

		const workflow = makeWorkflow({
			httpHeaderAuth: { id: 'cred-deleted', name: 'My Cred' },
		});
		await replaceInvalidCredentials(workflow, 'project-1');

		expect(credentialsRepository.findByNameAndTypeInProject).toHaveBeenCalledWith(
			'My Cred',
			'httpHeaderAuth',
			'project-1',
		);
		expect(workflow.nodes[0].credentials!.httpHeaderAuth).toEqual({
			id: 'cred-new',
			name: 'My Cred',
		});
	});

	it('should skip credential types that resolve to object internal keys', async () => {
		// JSON.parse keeps `__proto__` as an own enumerable key, unlike an object literal.
		const credentials = JSON.parse(
			'{"__proto__":{"id":"injected","name":"injected"},"constructor":{"id":"injected","name":"injected"}}',
		) as Record<string, { id: string; name: string }>;
		const workflow = makeWorkflow(credentials);

		await replaceInvalidCredentials(workflow, 'project-1');

		expect(credentialsRepository.findOneBy).not.toHaveBeenCalled();
		expect(credentialsRepository.findByNameAndTypeInProject).not.toHaveBeenCalled();
		expect(({} as Record<string, unknown>).id).toBeUndefined();
		expect(({} as Record<string, unknown>).injected).toBeUndefined();
	});
});

describe('removeDefaultValues', () => {
	const DEFAULT_EXECUTION_TIMEOUT = 3600;
	const DEFAULT = 'DEFAULT';

	it('should remove errorWorkflow when set to DEFAULT', () => {
		const settings: IWorkflowSettings = {
			errorWorkflow: DEFAULT,
			timezone: 'America/New_York',
		};
		const result = removeDefaultValues(settings, DEFAULT_EXECUTION_TIMEOUT);
		expect(result).toEqual({
			timezone: 'America/New_York',
		});
	});

	it('should remove all keys set to DEFAULT', () => {
		const settings: IWorkflowSettings = {
			errorWorkflow: DEFAULT,
			timezone: DEFAULT,
			saveDataErrorExecution: DEFAULT,
			saveDataSuccessExecution: DEFAULT,
			saveManualExecutions: DEFAULT,
			saveExecutionProgress: DEFAULT,
			callerPolicy: 'workflowsFromSameOwner',
		};
		const result = removeDefaultValues(settings, DEFAULT_EXECUTION_TIMEOUT);
		expect(result).toEqual({
			callerPolicy: 'workflowsFromSameOwner',
		});
	});

	it('should remove executionTimeout when it matches default', () => {
		const settings: IWorkflowSettings = {
			executionTimeout: 3600,
			timezone: 'America/New_York',
		};
		const result = removeDefaultValues(settings, DEFAULT_EXECUTION_TIMEOUT);
		expect(result).toEqual({
			timezone: 'America/New_York',
		});
	});

	it('should keep executionTimeout when it differs from default', () => {
		const settings: IWorkflowSettings = {
			executionTimeout: 7200,
			timezone: 'America/New_York',
		};
		const result = removeDefaultValues(settings, DEFAULT_EXECUTION_TIMEOUT);
		expect(result).toEqual({
			executionTimeout: 7200,
			timezone: 'America/New_York',
		});
	});

	it('should keep non-DEFAULT values', () => {
		const settings: IWorkflowSettings = {
			errorWorkflow: 'some-workflow-id',
			timezone: 'America/New_York',
			saveDataErrorExecution: 'all',
		};
		const result = removeDefaultValues(settings, DEFAULT_EXECUTION_TIMEOUT);
		expect(result).toEqual({
			errorWorkflow: 'some-workflow-id',
			timezone: 'America/New_York',
			saveDataErrorExecution: 'all',
		});
	});

	it('should remove credentialResolverId when empty string', () => {
		const settings: IWorkflowSettings = {
			credentialResolverId: '',
			timezone: 'America/New_York',
		};
		const result = removeDefaultValues(settings, DEFAULT_EXECUTION_TIMEOUT);
		expect(result).toEqual({
			timezone: 'America/New_York',
		});
	});

	it('should remove credentialResolverId when undefined', () => {
		const settings: IWorkflowSettings = {
			credentialResolverId: undefined,
			timezone: 'America/New_York',
		};
		const result = removeDefaultValues(settings, DEFAULT_EXECUTION_TIMEOUT);
		expect(result).not.toHaveProperty('credentialResolverId');
	});

	it('should keep credentialResolverId when set to a valid ID', () => {
		const settings: IWorkflowSettings = {
			credentialResolverId: 'resolver-id-123',
			timezone: 'America/New_York',
		};
		const result = removeDefaultValues(settings, DEFAULT_EXECUTION_TIMEOUT);
		expect(result).toEqual({
			credentialResolverId: 'resolver-id-123',
			timezone: 'America/New_York',
		});
	});

	it('should not mutate the original settings object', () => {
		const settings = {
			errorWorkflow: DEFAULT,
			timezone: 'America/New_York',
			executionTimeout: 3600,
		};
		const originalSettings = { ...settings };
		removeDefaultValues(settings, DEFAULT_EXECUTION_TIMEOUT);
		expect(settings).toEqual(originalSettings);
	});
});

describe('validateWorkflowStructure', () => {
	it('returns silently when the workflow is structurally valid', () => {
		expect(() =>
			validateWorkflowStructure({
				nodes: [
					{
						id: 'n1',
						name: 'Manual',
						type: 'n8n-nodes-base.manualTrigger',
						position: [0, 0],
						parameters: {},
					} as never,
				],
				connections: {},
			}),
		).not.toThrow();
	});

	it('throws WorkflowStructureBadRequestError carrying the Zod issues', () => {
		let caught: unknown;
		try {
			validateWorkflowStructure({
				nodes: [
					{
						id: 'n1',
						name: 'Bad',
						type: 'n8n-nodes-base.manualTrigger',
						position: [0, 0],
						parameters: null,
					} as never,
				],
				connections: {},
			});
		} catch (error) {
			caught = error;
		}

		expect(caught).toBeInstanceOf(WorkflowStructureBadRequestError);
		// Subclass of BadRequestError so existing HTTP handlers still see a 400.
		expect(caught).toBeInstanceOf(BadRequestError);
		const structured = caught as WorkflowStructureBadRequestError;
		expect(structured.message).toContain('Workflow structure is invalid.');
		expect(structured.message).toContain('nodes[0].parameters');
		expect(structured.issues.length).toBeGreaterThan(0);
		expect(structured.issues[0]).toMatchObject({
			path: ['nodes', 0, 'parameters'],
			code: 'invalid_type',
		});
	});
});

describe('validateWorkflowNodeGroups', () => {
	const makeNode = (id: string) =>
		({ id, name: `Node ${id}`, type: 'test', position: [0, 0], parameters: {} }) as never;

	it('should pass when nodeGroups is undefined', () => {
		expect(() =>
			validateWorkflowNodeGroups({ nodes: [makeNode('n1')], nodeGroups: undefined }),
		).not.toThrow();
	});

	it('should pass when nodeGroups is empty', () => {
		expect(() =>
			validateWorkflowNodeGroups({ nodes: [makeNode('n1')], nodeGroups: [] }),
		).not.toThrow();
	});

	it('should pass when all nodeIds reference existing nodes', () => {
		expect(() =>
			validateWorkflowNodeGroups({
				nodes: [makeNode('n1'), makeNode('n2')],
				nodeGroups: [{ id: 'g1', name: 'Group 1', nodeIds: ['n1', 'n2'] }],
			}),
		).not.toThrow();
	});

	it('should throw when a nodeId does not reference an existing node', () => {
		expect(() =>
			validateWorkflowNodeGroups({
				nodes: [makeNode('n1')],
				nodeGroups: [{ id: 'g1', name: 'My Group', nodeIds: ['n1', 'n999'] }],
			}),
		).toThrow('Group "My Group" references node ID "n999" that does not exist in the workflow.');
	});

	it('should throw for the first invalid nodeId found', () => {
		expect(() =>
			validateWorkflowNodeGroups({
				nodes: [],
				nodeGroups: [{ id: 'g1', name: 'Empty Group', nodeIds: ['bad1', 'bad2'] }],
			}),
		).toThrow('Group "Empty Group" references node ID "bad1"');
	});

	it('should throw when a node belongs to multiple groups', () => {
		expect(() =>
			validateWorkflowNodeGroups({
				nodes: [makeNode('n1'), makeNode('n2')],
				nodeGroups: [
					{ id: 'g1', name: 'Group A', nodeIds: ['n1'] },
					{ id: 'g2', name: 'Group B', nodeIds: ['n1', 'n2'] },
				],
			}),
		).toThrow('Node "n1" belongs to multiple groups: "Group A" and "Group B".');
	});

	it('should throw when group names are not unique', () => {
		expect(() =>
			validateWorkflowNodeGroups({
				nodes: [makeNode('n1')],
				nodeGroups: [
					{ id: 'g1', name: 'Duplicate', nodeIds: ['n1'] },
					{ id: 'g2', name: 'Duplicate', nodeIds: [] },
				],
			}),
		).toThrow('Duplicate node group name "Duplicate".');
	});
});

describe('validatePinDataSize', () => {
	const baseWorkflow: IWorkflowBase = {
		id: '1',
		name: 'Test',
		nodes: [],
		connections: {},
		active: false,
		isArchived: false,
		activeVersionId: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	it('should pass when pinData is undefined', () => {
		expect(() => validatePinDataSize(baseWorkflow)).not.toThrow();
	});

	it('should pass when pinData is not set', () => {
		expect(() => validatePinDataSize({ ...baseWorkflow, pinData: undefined })).not.toThrow();
	});

	it('should pass when pinData is small', () => {
		expect(() =>
			validatePinDataSize({
				...baseWorkflow,
				pinData: { myNode: [{ json: { key: 'value' } }] },
			}),
		).not.toThrow();
	});

	it('should throw when pinData exceeds MAX_PINNED_DATA_SIZE', () => {
		const largeValue = 'x'.repeat(MAX_PINNED_DATA_SIZE + 1);
		expect(() =>
			validatePinDataSize({
				...baseWorkflow,
				pinData: { myNode: [{ json: { data: largeValue } }] },
			}),
		).toThrow(
			`Pinned data exceeds the maximum allowed size of ${MAX_PINNED_DATA_SIZE / (1024 * 1024)} MB`,
		);
	});

	it('should throw when workflow + pinData exceeds total size limit', () => {
		const limit = MAX_WORKFLOW_SIZE - MAX_EXPECTED_REQUEST_SIZE;
		// Make pinData ~10 MB (under 12 MB limit)
		const pinDataSize = 10 * 1024 * 1024;
		const largeValue = 'x'.repeat(pinDataSize);
		// Make the workflow itself large enough so that workflow + pinData > limit
		const largeNodes = 'y'.repeat(limit - pinDataSize);
		expect(() =>
			validatePinDataSize({
				...baseWorkflow,
				staticData: { filler: largeNodes },
				pinData: { myNode: [{ json: { data: largeValue } }] },
			}),
		).toThrow(
			`Workflow with pinned data exceeds the maximum allowed size of ${Math.floor(limit / (1024 * 1024))} MB`,
		);
	});
});

describe('getLastExecutedNodeData', () => {
	const lastNodeTaskData: ITaskData = {
		startTime: 0,
		executionIndex: 0,
		executionTime: 0,
		executionStatus: 'success',
		source: [],
		data: { main: [[{ json: { ok: true } }]] },
	};

	function buildRun(pinData: unknown): IRun {
		return {
			mode: 'webhook',
			startedAt: new Date(),
			status: 'success',
			storedAt: 'db',
			data: {
				resultData: {
					runData: { 'Log Assistant Message': [lastNodeTaskData] },
					lastNodeExecuted: 'Log Assistant Message',
					// Persisted execution data can contain `pinData: null` for workflows
					// created without a pinData column (e.g. older AI-built workflows).
					pinData,
				},
			},
		} as unknown as IRun;
	}

	it('returns last node run data when pinData is null', () => {
		// Regression: destructure default `pinData = {}` only applies to undefined,
		// so a null value used to throw `Cannot read properties of null`.
		expect(() => getLastExecutedNodeData(buildRun(null))).not.toThrow();
		expect(getLastExecutedNodeData(buildRun(null))).toBe(lastNodeTaskData);
	});

	it('returns last node run data when pinData is undefined', () => {
		expect(getLastExecutedNodeData(buildRun(undefined))).toBe(lastNodeTaskData);
	});
});

describe('getLastExecutedNodeRuns', () => {
	function buildRun(
		lastNodeExecuted: string | undefined,
		runData: Record<string, ITaskData[]>,
	): IRun {
		return {
			data: {
				resultData: {
					lastNodeExecuted,
					runData,
				},
			},
		} as unknown as IRun;
	}

	it('returns an empty array when no last node executed is recorded', () => {
		expect(getLastExecutedNodeRuns(buildRun(undefined, {}))).toEqual([]);
	});

	it('returns an empty array when the recorded last node has no run data', () => {
		expect(getLastExecutedNodeRuns(buildRun('Last executed node', {}))).toEqual([]);
		expect(
			getLastExecutedNodeRuns(buildRun('Last executed node', { 'Last executed node': [] })),
		).toEqual([]);
	});

	it('returns every recorded run of the last executed node, in order', () => {
		const runs = [
			mock<ITaskData>({ executionIndex: 0, data: { main: [[{ json: { value: 0 } }]] } }),
			mock<ITaskData>({ executionIndex: 1, data: { main: [[{ json: { value: 1 } }]] } }),
			mock<ITaskData>({ executionIndex: 2, data: { main: [[{ json: { value: 2 } }]] } }),
		];
		expect(
			getLastExecutedNodeRuns(buildRun('Last executed node', { 'Last executed node': runs })),
		).toEqual(runs);
	});

	it('sorts runs by executionIndex when recorded out of order', () => {
		const run0 = mock<ITaskData>({ executionIndex: 0, data: { main: [[{ json: { value: 0 } }]] } });
		const run1 = mock<ITaskData>({ executionIndex: 1, data: { main: [[{ json: { value: 1 } }]] } });
		const run2 = mock<ITaskData>({ executionIndex: 2, data: { main: [[{ json: { value: 2 } }]] } });
		const outOfOrderRuns = [run2, run0, run1];
		expect(
			getLastExecutedNodeRuns(
				buildRun('Last executed node', { 'Last executed node': outOfOrderRuns }),
			),
		).toEqual([run0, run1, run2]);
	});

	it('does not mutate the original runData array', () => {
		const runs = [
			mock<ITaskData>({ executionIndex: 2, data: { main: [[{ json: { value: 2 } }]] } }),
			mock<ITaskData>({ executionIndex: 0, data: { main: [[{ json: { value: 0 } }]] } }),
		];
		const snapshot = [...runs];
		getLastExecutedNodeRuns(buildRun('Last executed node', { 'Last executed node': runs }));
		expect(runs).toEqual(snapshot);
	});
});

describe('updateParentExecutionWithChildResults', () => {
	const PARENT_ID = 'parent-execution-id';

	const waitingParent = (): IExecutionResponse =>
		({
			status: 'waiting',
			data: {
				executionData: {
					nodeExecutionStack: [
						{
							node: { name: 'Execute Sub-workflow' },
							data: { main: [[{ json: { in: 1 } }]] },
							source: null,
						},
					],
				},
			},
		}) as unknown as IExecutionResponse;

	const childRun = (
		status: string,
		lastNode: string,
		nodeRun: Partial<ITaskData>,
		error?: ExecutionError,
	): IRun =>
		({
			mode: 'integrated',
			status,
			data: {
				resultData: { lastNodeExecuted: lastNode, error, runData: { [lastNode]: [nodeRun] } },
			},
		}) as unknown as IRun;

	type StackEntry = {
		data?: unknown;
		metadata?: { resumeError?: ExecutionError; subExecution?: RelatedExecution };
	};

	// Runs the workflow helper against a waiting parent and returns the updated stack entry.
	async function resumeWith(child: IRun, childExecution?: RelatedExecution) {
		const executionPersistence = mockInstance(ExecutionPersistence);
		executionPersistence.findSingleExecution.mockResolvedValue(waitingParent());

		await updateParentExecutionWithChildResults(PARENT_ID, child, childExecution);

		expect(executionPersistence.updateExistingExecution).toHaveBeenCalledTimes(1);
		const [, payload] = executionPersistence.updateExistingExecution.mock.calls[0];
		return (payload as IExecutionResponse).data.executionData!
			.nodeExecutionStack[0] as unknown as StackEntry;
	}

	it('carries the child error and execution reference onto the parent node so resume can fail it', async () => {
		const error = { name: 'NodeOperationError', message: 'ERROR' } as unknown as ExecutionError;
		const entry = await resumeWith(childRun('error', 'Stop and Error', { error }, error), {
			executionId: 'child-execution-id',
			workflowId: 'child-workflow-id',
		});

		expect(entry.metadata?.resumeError).toMatchObject({ message: 'ERROR' });
		expect(entry.metadata?.subExecution).toEqual({
			executionId: 'child-execution-id',
			workflowId: 'child-workflow-id',
		});
	});

	it('copies the last node output for a successful child and sets no resume error', async () => {
		const entry = await resumeWith(
			childRun('success', 'Done', { data: { main: [[{ json: { out: 2 } }]] } }),
		);

		expect(entry.data).toEqual({ main: [[{ json: { out: 2 } }]] });
		expect(entry.metadata?.resumeError).toBeUndefined();
	});

	// In "run once for each item" mode multiple children update the same waiting
	// parent. Contract: if any child errored before the parent resumed, the parent
	// node fails — a later successful sibling must not mask the error.
	it.each(['error-then-success', 'success-then-error'] as const)(
		'preserves the child error on the parent when children complete in order %s',
		async (order) => {
			// In-memory persistence: deep-clone on read so the second call can only see
			// the first call's write through the persisted blob, not via object aliasing
			// (the helper mutates the stack entry it read in place).
			let stored = waitingParent();
			const executionPersistence = mockInstance(ExecutionPersistence);
			executionPersistence.findSingleExecution.mockImplementation(async () =>
				structuredClone(stored),
			);
			executionPersistence.updateExistingExecution.mockImplementation(async (_id, patch) => {
				stored = { ...stored, ...patch } as IExecutionResponse;
				return true;
			});

			const error = { name: 'NodeOperationError', message: 'ERROR' } as unknown as ExecutionError;
			const errorChild = childRun('error', 'Stop and Error', { error }, error);
			const successChild = childRun('success', 'Done', {
				data: { main: [[{ json: { out: 2 } }]] },
			});
			const children =
				order === 'error-then-success' ? [errorChild, successChild] : [successChild, errorChild];

			for (const child of children) {
				await updateParentExecutionWithChildResults(PARENT_ID, child);
			}

			const entry = stored.data.executionData!.nodeExecutionStack[0] as unknown as StackEntry;
			expect(entry.metadata?.resumeError).toMatchObject({ message: 'ERROR' });
			expect(entry.data).toEqual({ main: [[{ json: { out: 2 } }]] });
			expect(executionPersistence.updateExistingExecution).toHaveBeenCalledTimes(2);
		},
	);
});
