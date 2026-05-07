import type { AuthenticatedRequest, EvaluationConfig, User, WorkflowEntity } from '@n8n/db';
import type { TestRunRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { EvaluationConfigValidator } from '@/evaluation.ee/evaluation-config-validator';
import type { TestRunnerService } from '@/evaluation.ee/test-runner/test-runner.service.ee';
import type { WorkflowCompilerService } from '@/evaluation.ee/test-runner/workflow-compiler.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { EvaluationApiError } from '../evaluation-api-error';
import { EvaluationConfigController } from '../evaluation-config.controller';
import type { EvaluationConfigService } from '../evaluation-config.service';

describe('EvaluationConfigController', () => {
	let controller: EvaluationConfigController;
	let service: jest.Mocked<EvaluationConfigService>;
	let workflowFinderService: jest.Mocked<WorkflowFinderService>;
	let testRunRepository: jest.Mocked<TestRunRepository>;
	let testRunnerService: jest.Mocked<TestRunnerService>;
	let validator: jest.Mocked<EvaluationConfigValidator>;
	let compiler: jest.Mocked<WorkflowCompilerService>;

	const user = mock<User>({ id: 'user-1' });
	const workflow = mock<WorkflowEntity>({ id: 'wf-1' });

	beforeEach(() => {
		service = mock<EvaluationConfigService>();
		workflowFinderService = mock<WorkflowFinderService>();
		testRunRepository = mock<TestRunRepository>();
		testRunnerService = mock<TestRunnerService>();
		validator = mock<EvaluationConfigValidator>();
		compiler = mock<WorkflowCompilerService>();
		workflowFinderService.findWorkflowForUser.mockResolvedValue(workflow);
		validator.validate.mockResolvedValue([]);
		controller = new EvaluationConfigController(
			service,
			workflowFinderService,
			testRunRepository,
			testRunnerService,
			validator,
			compiler,
		);
	});

	function makeReq<P extends { workflowId: string }>(
		params: P,
		body: unknown = {},
	): AuthenticatedRequest<P> {
		return { user, params, body } as unknown as AuthenticatedRequest<P>;
	}

	describe('list', () => {
		it('returns the list under workflow:read access', async () => {
			const rows = [{ id: 'c1' }] as EvaluationConfig[];
			service.list.mockResolvedValueOnce(rows);

			const result = await controller.list(makeReq({ workflowId: 'wf-1' }));

			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith('wf-1', user, [
				'workflow:read',
			]);
			expect(result).toBe(rows);
		});

		it('throws NotFoundError when workflow access fails', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValueOnce(null);
			await expect(controller.list(makeReq({ workflowId: 'wf-1' }))).rejects.toThrow(NotFoundError);
		});
	});

	describe('get', () => {
		it('returns the config under workflow:read', async () => {
			const cfg = { id: 'cfg-1', workflowId: 'wf-1' } as EvaluationConfig;
			service.get.mockResolvedValueOnce(cfg);

			const result = await controller.get(makeReq({ workflowId: 'wf-1', configId: 'cfg-1' }));

			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith('wf-1', user, [
				'workflow:read',
			]);
			expect(result).toBe(cfg);
		});

		it('throws NotFoundError when the service returns null', async () => {
			service.get.mockResolvedValueOnce(null);
			await expect(
				controller.get(makeReq({ workflowId: 'wf-1', configId: 'cfg-1' })),
			).rejects.toThrow(NotFoundError);
		});
	});

	describe('create', () => {
		const validBody = {
			name: 'eval',
			datasetSource: 'data_table',
			datasetRef: { dataTableId: 'dt-1' },
			startNodeName: 'Start',
			endNodeName: 'End',
			metrics: [
				{
					id: 'm1',
					name: 'A',
					type: 'expression',
					config: { expression: '={{ 1 }}', outputType: 'numeric' },
				},
			],
		};

		it('creates under workflow:update and returns the persisted entity', async () => {
			const cfg = { id: 'cfg-1', workflowId: 'wf-1' } as EvaluationConfig;
			service.create.mockResolvedValueOnce(cfg);

			const result = await controller.create(makeReq({ workflowId: 'wf-1' }, validBody));

			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith('wf-1', user, [
				'workflow:update',
			]);
			expect(service.create).toHaveBeenCalledWith(
				'wf-1',
				workflow,
				user,
				expect.objectContaining({ name: 'eval' }),
			);
			expect(result).toBe(cfg);
		});

		it('rejects malformed bodies with a Zod error', async () => {
			await expect(
				controller.create(makeReq({ workflowId: 'wf-1' }, { name: '' })),
			).rejects.toThrow();
			expect(service.create).not.toHaveBeenCalled();
		});

		it('propagates EvaluationApiError', async () => {
			service.create.mockRejectedValueOnce(
				new EvaluationApiError('EVALUATION_QUOTA_EXCEEDED', 'over limit'),
			);
			await expect(
				controller.create(makeReq({ workflowId: 'wf-1' }, validBody)),
			).rejects.toMatchObject({ code: 'EVALUATION_QUOTA_EXCEEDED' });
		});
	});

	describe('update', () => {
		const validBody = {
			name: 'updated',
			datasetSource: 'data_table',
			datasetRef: { dataTableId: 'dt-1' },
			startNodeName: 'Start',
			endNodeName: 'End',
			metrics: [
				{
					id: 'm1',
					name: 'A',
					type: 'expression',
					config: { expression: '={{ 1 }}', outputType: 'numeric' },
				},
			],
		};

		it('updates under workflow:update and returns the updated entity', async () => {
			const cfg = { id: 'cfg-1', workflowId: 'wf-1', name: 'updated' } as EvaluationConfig;
			service.update.mockResolvedValueOnce(cfg);

			const result = await controller.update(
				makeReq({ workflowId: 'wf-1', configId: 'cfg-1' }, validBody),
			);

			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith('wf-1', user, [
				'workflow:update',
			]);
			expect(service.update).toHaveBeenCalledWith(
				'wf-1',
				'cfg-1',
				workflow,
				user,
				expect.objectContaining({ name: 'updated' }),
			);
			expect(result).toBe(cfg);
		});
	});

	describe('delete', () => {
		it('deletes under workflow:update and returns success', async () => {
			service.delete.mockResolvedValueOnce(undefined);
			const result = await controller.delete(makeReq({ workflowId: 'wf-1', configId: 'cfg-1' }));
			expect(service.delete).toHaveBeenCalledWith('wf-1', 'cfg-1');
			expect(result).toEqual({ success: true });
		});
	});

	describe('dispatch', () => {
		const makeRes = () => {
			const res = { status: jest.fn(), json: jest.fn() } as unknown as {
				status: jest.Mock;
				json: jest.Mock;
			};
			res.status.mockReturnValue(res);
			res.json.mockReturnValue(res);
			return res;
		};

		it('validates, compiles and dispatches the runner, then responds 202 with testRunId', async () => {
			const validConfig = { id: 'cfg-1', workflowId: 'wf-1', status: 'valid' } as EvaluationConfig;
			const compiled = { id: 'wf-1', nodes: [], connections: {} } as never;
			service.get.mockResolvedValueOnce(validConfig);
			compiler.compile.mockReturnValueOnce(compiled);
			testRunRepository.createTestRun.mockResolvedValueOnce({ id: 'run-1' } as never);

			const res = makeRes();
			await controller.dispatch(makeReq({ workflowId: 'wf-1', configId: 'cfg-1' }), res as never);

			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith('wf-1', user, [
				'workflow:update',
			]);
			expect(validator.validate).toHaveBeenCalledWith({ workflow, config: validConfig, user });
			expect(compiler.compile).toHaveBeenCalledWith(workflow, validConfig);
			expect(testRunRepository.createTestRun).toHaveBeenCalledWith('wf-1');
			expect(testRunnerService.runTest).toHaveBeenCalledWith(user, 'wf-1', 1, false, {
				existingTestRunId: 'run-1',
				compiledWorkflow: compiled,
			});
			expect(res.status).toHaveBeenCalledWith(202);
			expect(res.json).toHaveBeenCalledWith({ testRunId: 'run-1' });
		});

		it('throws NotFoundError when the config does not exist', async () => {
			service.get.mockResolvedValueOnce(null);
			await expect(
				controller.dispatch(
					makeReq({ workflowId: 'wf-1', configId: 'missing' }),
					makeRes() as never,
				),
			).rejects.toThrow(NotFoundError);
			expect(testRunRepository.createTestRun).not.toHaveBeenCalled();
			expect(testRunnerService.runTest).not.toHaveBeenCalled();
		});

		it('throws ConflictError when the config is invalid', async () => {
			service.get.mockResolvedValueOnce({
				id: 'cfg-1',
				workflowId: 'wf-1',
				status: 'invalid',
				invalidReason: 'END_NODE_DELETED',
			} as EvaluationConfig);

			await expect(
				controller.dispatch(makeReq({ workflowId: 'wf-1', configId: 'cfg-1' }), makeRes() as never),
			).rejects.toThrow(ConflictError);
			expect(testRunRepository.createTestRun).not.toHaveBeenCalled();
		});

		it('throws BadRequestError when validation reports errors', async () => {
			service.get.mockResolvedValueOnce({
				id: 'cfg-1',
				workflowId: 'wf-1',
				status: 'valid',
			} as EvaluationConfig);
			validator.validate.mockResolvedValueOnce([
				{ code: 'END_NODE_NOT_FOUND', message: 'no end node' } as never,
			]);

			await expect(
				controller.dispatch(makeReq({ workflowId: 'wf-1', configId: 'cfg-1' }), makeRes() as never),
			).rejects.toThrow(BadRequestError);
			expect(compiler.compile).not.toHaveBeenCalled();
			expect(testRunRepository.createTestRun).not.toHaveBeenCalled();
		});

		it('throws BadRequestError when the compiler fails', async () => {
			service.get.mockResolvedValueOnce({
				id: 'cfg-1',
				workflowId: 'wf-1',
				status: 'valid',
			} as EvaluationConfig);
			compiler.compile.mockImplementationOnce(() => {
				throw new Error('boom');
			});

			await expect(
				controller.dispatch(makeReq({ workflowId: 'wf-1', configId: 'cfg-1' }), makeRes() as never),
			).rejects.toThrow(BadRequestError);
			expect(testRunRepository.createTestRun).not.toHaveBeenCalled();
		});
	});
});
