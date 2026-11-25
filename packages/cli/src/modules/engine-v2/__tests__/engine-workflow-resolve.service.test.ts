import type { Logger } from '@n8n/backend-common';
import type { NodeTypesProxy, UrlService } from '@n8n/backend-services';
import type { GlobalConfig } from '@n8n/config';
import type { Project, WorkflowRepository } from '@n8n/db';
import type { JsonObject } from '@n8n/engine';
import { OperationalError, ResponseError } from '@n8n/errors';
import type { INode, INodeType, IWorkflowBase } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { SubworkflowPolicyDenialError } from '@/errors/subworkflow-policy-denial.error';
import type {
	CredentialsPermissionChecker,
	SubworkflowPolicyChecker,
} from '@/executions/pre-execution-checks';
import type { OwnershipService } from '@/services/ownership.service';
import { getPublishedWorkflowData } from '@/workflow-execute-additional-data';

import type {
	ResolvedErrorWorkflow,
	ResolveErrorWorkflowRequest,
} from '../engine-workflow-resolve.contract';
import { EngineWorkflowResolveService } from '../engine-workflow-resolve.service';

vi.mock('@/workflow-execute-additional-data', () => ({
	getBase: vi.fn(),
	getDraftWorkflowData: vi.fn(),
	getPublishedWorkflowData: vi.fn(),
	triggerReturnsLastRunOnly: vi.fn(),
}));

const ERROR_TRIGGER_TYPE = 'n8n-nodes-base.errorTrigger';

const node = (name: string, type: string, overrides: Partial<INode> = {}): INode => ({
	id: `${name}-id`,
	name,
	type,
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
	...overrides,
});

const SCHEDULE = node('Schedule', 'n8n-nodes-base.scheduleTrigger');
const CODE = node('Code', 'n8n-nodes-base.code');
const ERROR_TRIGGER = node('Error Trigger', ERROR_TRIGGER_TYPE);
const SET = node('Set', 'n8n-nodes-base.set');

const main = (to: string) => ({
	main: [[{ node: to, type: NodeConnectionTypes.Main, index: 0 }]],
});

const failedExecutionId = '01a03900-0000-7000-8000-00000000000a';
const errorExecutionId = '01a03900-0000-7000-8000-00000000000b';

/** The stored document of the failed execution, as the dispatcher sent it at start. */
const failedDocument = (
	settings: Record<string, string> = { errorWorkflow: 'err-wf' },
	nodes = [SCHEDULE, CODE],
) =>
	({
		id: 'failed-wf',
		name: 'Failed workflow',
		nodes,
		connections: { [SCHEDULE.name]: main(CODE.name) },
		settings: { engineType: 'v2', ...settings },
	}) as unknown as JsonObject;

type Source = ResolveErrorWorkflowRequest['source'];

/** A request for the error workflow of the failed execution, with source fields overridden. */
const source = (overrides: Partial<Source> = {}): ResolveErrorWorkflowRequest => ({
	kind: 'error-workflow',
	executionId: errorExecutionId,
	source: {
		executionId: failedExecutionId,
		workflowId: 'failed-wf',
		workflow: failedDocument(),
		hostMode: 'trigger',
		hasParent: false,
		failedStep: {
			nodeName: CODE.name,
			error: { name: 'NodeOperationError', message: 'boom', details: { description: 'why' } },
		},
		...overrides,
	},
});

const errorWorkflow = (overrides: Partial<IWorkflowBase> = {}): IWorkflowBase => ({
	id: 'err-wf',
	name: 'Error handler',
	active: true,
	isArchived: false,
	activeVersionId: 'v1',
	createdAt: new Date(),
	updatedAt: new Date(),
	nodes: [ERROR_TRIGGER, SET],
	connections: { [ERROR_TRIGGER.name]: main(SET.name) },
	settings: { engineType: 'v2' },
	...overrides,
});

describe('EngineWorkflowResolveService, for an error workflow', () => {
	const workflowRepository = mock<WorkflowRepository>();
	const policyChecker = mock<SubworkflowPolicyChecker>();
	const credentialsPermissionChecker = mock<CredentialsPermissionChecker>();
	const nodeTypes = mock<NodeTypesProxy>();
	const ownershipService = mock<OwnershipService>();
	const urlService = mock<UrlService>();
	const logger = mock<Logger>();
	const globalConfig = mock<GlobalConfig>({ nodes: { errorTriggerType: ERROR_TRIGGER_TYPE } });

	let service: EngineWorkflowResolveService;

	const resolveStart = async (request = source()): Promise<ResolvedErrorWorkflow> =>
		await service.resolve(request);

	beforeEach(() => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		workflowRepository.exists.mockResolvedValue(true);
		policyChecker.check.mockResolvedValue(undefined);
		ownershipService.getWorkflowProjectCached.mockResolvedValue(
			mock<Project>({ id: 'failed-project' }),
		);
		urlService.getInstanceBaseUrl.mockReturnValue('https://n8n.example.com');
		vi.mocked(getPublishedWorkflowData).mockResolvedValue(errorWorkflow());
		// No execute method: the items pass through, as the Error Trigger returns them outside a manual run.
		nodeTypes.getByNameAndVersion.mockReturnValue({ description: {} } as INodeType);
		service = new EngineWorkflowResolveService(
			workflowRepository,
			policyChecker,
			credentialsPermissionChecker,
			nodeTypes,
			ownershipService,
			urlService,
			globalConfig,
			logger,
		);
	});

	describe('a start', () => {
		it('roots the graph at the Error Trigger', async () => {
			const start = await resolveStart();

			expect(start.kind).toBe('error-workflow');
			expect(start.workflowId).toBe('err-wf');
			expect(start.graph.nodes[0]).toEqual(
				expect.objectContaining({ name: ERROR_TRIGGER.name, type: 'trigger' }),
			);
			expect(start.workflow).toEqual(expect.objectContaining({ id: 'err-wf' }));
		});

		it('loads the published version of the error workflow', async () => {
			await resolveStart();

			expect(getPublishedWorkflowData).toHaveBeenCalledExactlyOnceWith(
				{ id: 'err-wf' },
				'failed-wf',
			);
		});

		it('runs in the project of the failed workflow, with no user', async () => {
			const start = await resolveStart();

			expect(ownershipService.getWorkflowProjectCached).toHaveBeenCalledWith('failed-wf');
			expect(start.projectId).toBe('failed-project');
		});

		it('gives the Error Trigger the v1 item of the failure as its output', async () => {
			const start = await resolveStart();

			expect(start.triggerOutputs).toEqual([
				[
					{
						json: {
							execution: {
								id: failedExecutionId,
								url: `https://n8n.example.com/workflow/failed-wf/executions/${failedExecutionId}`,
								error: expect.objectContaining({
									name: 'NodeOperationError',
									message: 'boom',
									description: 'why',
								}),
								lastNodeExecuted: CODE.name,
								mode: 'trigger',
							},
							workflow: { id: 'failed-wf', name: 'Failed workflow' },
						},
					},
				],
			]);
		});

		it('reports a failed sub-execution in the integrated mode, as v1 runs it', async () => {
			const start = await resolveStart(source({ hostMode: 'manual', hasParent: true }));

			expect(start.triggerOutputs).toEqual([
				[
					{
						json: expect.objectContaining({
							execution: expect.objectContaining({ mode: 'integrated' }),
						}),
					},
				],
			]);
		});

		it('reports a generic error when no step failed, with no last node', async () => {
			const start = await resolveStart(source({ failedStep: undefined }));

			const [[{ json }]] = start.triggerOutputs as Array<Array<{ json: { execution: object } }>>;
			expect(json.execution).toEqual(
				expect.objectContaining({
					error: expect.objectContaining({ message: 'The execution failed' }),
				}),
			);
			expect(json.execution).not.toHaveProperty('lastNodeExecuted');
		});

		it('applies the caller policy of the error workflow to the failed workflow and its failed node', async () => {
			await resolveStart();

			expect(policyChecker.check).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ id: 'err-wf' }),
				'failed-wf',
				CODE,
				undefined,
			);
		});

		it('runs no credential check, as v1 runs none for an error workflow', async () => {
			await resolveStart();

			expect(credentialsPermissionChecker.check).not.toHaveBeenCalled();
		});

		it('starts the failed workflow from its own Error Trigger when the settings name none', async () => {
			const own = errorWorkflow({ id: 'failed-wf', nodes: [SCHEDULE, CODE, ERROR_TRIGGER] });
			vi.mocked(getPublishedWorkflowData).mockResolvedValue(own);
			const document = failedDocument({}, [SCHEDULE, CODE, ERROR_TRIGGER]);

			const start = await resolveStart(source({ workflow: document }));

			expect(start.workflowId).toBe('failed-wf');
			expect(getPublishedWorkflowData).toHaveBeenCalledWith({ id: 'failed-wf' }, 'failed-wf');
		});

		it('starts a sub-execution of an error run that names its own workflow, as v1 runs it as integrated', async () => {
			vi.mocked(getPublishedWorkflowData).mockResolvedValue(errorWorkflow({ id: 'failed-wf' }));

			const start = await resolveStart(
				source({
					hostMode: 'error',
					hasParent: true,
					workflow: failedDocument({ errorWorkflow: 'failed-wf' }),
				}),
			);

			expect(start.workflowId).toBe('failed-wf');
		});
	});

	describe('resolveErrorWorkflowOnFailure', () => {
		it('is true when the error workflow names another workflow', async () => {
			vi.mocked(getPublishedWorkflowData).mockResolvedValue(
				errorWorkflow({ settings: { engineType: 'v2', errorWorkflow: 'other-wf' } }),
			);

			expect((await resolveStart()).resolveErrorWorkflowOnFailure).toBe(true);
		});

		it('is false when the error workflow names itself', async () => {
			vi.mocked(getPublishedWorkflowData).mockResolvedValue(
				errorWorkflow({ settings: { engineType: 'v2', errorWorkflow: 'err-wf' } }),
			);

			expect((await resolveStart()).resolveErrorWorkflowOnFailure).toBe(false);
		});

		it('is false when the error workflow has only its own Error Trigger', async () => {
			expect((await resolveStart()).resolveErrorWorkflowOnFailure).toBe(false);
		});
	});

	describe('a refusal', () => {
		/** A 4xx, which the data plane turns into a `none` resolution. */
		const expectRefusal = async (request: ResolveErrorWorkflowRequest, reason: RegExp) => {
			const error: unknown = await service.resolve(request).catch((caught: unknown) => caught);
			expect(error).toBeInstanceOf(ResponseError);
			expect((error as ResponseError).httpStatusCode).toBeGreaterThanOrEqual(400);
			expect((error as ResponseError).httpStatusCode).toBeLessThan(500);
			expect((error as ResponseError).message).toMatch(reason);
		};

		it('applies when the stored document has no nodes', async () => {
			await expectRefusal(source({ workflow: { id: 'failed-wf' } }), /has no nodes/);
		});

		it('applies when the settings name no workflow and there is no Error Trigger', async () => {
			await expectRefusal(source({ workflow: failedDocument({}) }), /no error workflow/);
			expect(getPublishedWorkflowData).not.toHaveBeenCalled();
		});

		it('applies to an error run of a workflow that names itself', async () => {
			await expectRefusal(
				source({ hostMode: 'error', workflow: failedDocument({ errorWorkflow: 'failed-wf' }) }),
				/names itself/,
			);
		});

		it('applies to the own Error Trigger of an error run', async () => {
			const document = failedDocument({}, [SCHEDULE, CODE, ERROR_TRIGGER]);

			await expectRefusal(source({ hostMode: 'error', workflow: document }), /no error workflow/);
		});

		it('applies when the failed workflow no longer exists', async () => {
			workflowRepository.exists.mockResolvedValueOnce(false);

			await expectRefusal(source(), /no longer exists/);
			expect(ownershipService.getWorkflowProjectCached).not.toHaveBeenCalled();
		});

		it('applies when the error workflow does not exist', async () => {
			workflowRepository.exists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

			await expectRefusal(source(), /does not exist/);
		});

		it('applies when the error workflow has no published version', async () => {
			vi.mocked(getPublishedWorkflowData).mockRejectedValue(
				new OperationalError('Workflow is not active and cannot be executed.'),
			);

			await expectRefusal(source(), /not active/);
		});

		it('applies when the error workflow runs on engine v1', async () => {
			vi.mocked(getPublishedWorkflowData).mockResolvedValue(errorWorkflow({ settings: {} }));

			await expectRefusal(source(), /engine v1/);
		});

		it('applies when the published error workflow has only a disabled Error Trigger', async () => {
			vi.mocked(getPublishedWorkflowData).mockResolvedValue(
				errorWorkflow({ nodes: [{ ...ERROR_TRIGGER, disabled: true }, SET] }),
			);

			await expectRefusal(source(), /no enabled Error Trigger/);
		});

		it('applies when the caller policy refuses the failed workflow, and logs it', async () => {
			policyChecker.check.mockRejectedValue(
				new SubworkflowPolicyDenialError({
					subworkflowId: 'err-wf',
					subworkflowProject: mock<Project>(),
					instanceUrl: 'https://n8n.example.com',
					hasReadAccess: false,
				}),
			);

			await expect(service.resolve(source())).rejects.toMatchObject({ httpStatusCode: 403 });
			expect(logger.info).toHaveBeenCalledWith(
				expect.stringContaining('blocked'),
				expect.objectContaining({ erroredWorkflowId: 'failed-wf', errorWorkflowId: 'err-wf' }),
			);
		});

		it('applies when engine v2 cannot convert the error workflow', async () => {
			vi.mocked(getPublishedWorkflowData).mockResolvedValue(
				errorWorkflow({
					nodes: [ERROR_TRIGGER, SET, CODE],
					connections: {
						[ERROR_TRIGGER.name]: main(SET.name),
						[SET.name]: main(CODE.name),
						[CODE.name]: main(SET.name),
					},
				}),
			);

			await expectRefusal(source(), /cannot run the workflow/);
		});
	});

	describe('a transient failure', () => {
		it('throws when loading the error workflow fails', async () => {
			vi.mocked(getPublishedWorkflowData).mockRejectedValue(new Error('connection reset'));

			await expect(service.resolve(source())).rejects.toThrow('connection reset');
		});

		it('throws when the caller policy check fails for another reason', async () => {
			policyChecker.check.mockRejectedValue(new Error('cache unavailable'));

			await expect(service.resolve(source())).rejects.toThrow('cache unavailable');
		});

		it('throws when the project lookup fails', async () => {
			ownershipService.getWorkflowProjectCached.mockRejectedValue(new Error('db down'));

			await expect(service.resolve(source())).rejects.toThrow('db down');
		});
	});
});
