'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.TestRunsController = void 0;
const db_1 = require('@n8n/db');
const decorators_1 = require('@n8n/decorators');
const express_1 = __importDefault(require('express'));
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const conflict_error_1 = require('@/errors/response-errors/conflict.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const not_implemented_error_1 = require('@/errors/response-errors/not-implemented.error');
const test_runner_service_ee_1 = require('@/evaluation.ee/test-runner/test-runner.service.ee');
const middlewares_1 = require('@/middlewares');
const workflows_service_1 = require('@/public-api/v1/handlers/workflows/workflows.service');
const telemetry_1 = require('@/telemetry');
const workflow_finder_service_1 = require('@/workflows/workflow-finder.service');
let TestRunsController = class TestRunsController {
	constructor(
		testRunRepository,
		workflowFinderService,
		testCaseExecutionRepository,
		testRunnerService,
		instanceSettings,
		telemetry,
	) {
		this.testRunRepository = testRunRepository;
		this.workflowFinderService = workflowFinderService;
		this.testCaseExecutionRepository = testCaseExecutionRepository;
		this.testRunnerService = testRunnerService;
		this.instanceSettings = instanceSettings;
		this.telemetry = telemetry;
	}
	async getTestRun(testRunId, workflowId, user) {
		const sharedWorkflowsIds = await (0, workflows_service_1.getSharedWorkflowIds)(user, [
			'workflow:read',
		]);
		if (!sharedWorkflowsIds.includes(workflowId)) {
			throw new not_found_error_1.NotFoundError('Test run not found');
		}
		const testRun = await this.testRunRepository.findOne({
			where: { id: testRunId },
		});
		if (!testRun) throw new not_found_error_1.NotFoundError('Test run not found');
		return testRun;
	}
	async getMany(req) {
		const { workflowId } = req.params;
		return await this.testRunRepository.getMany(workflowId, req.listQueryOptions);
	}
	async getOne(req) {
		const { id } = req.params;
		try {
			await this.getTestRun(req.params.id, req.params.workflowId, req.user);
			return await this.testRunRepository.getTestRunSummaryById(id);
		} catch (error) {
			if (error instanceof n8n_workflow_1.UnexpectedError)
				throw new not_found_error_1.NotFoundError(error.message);
			throw error;
		}
	}
	async getTestCases(req) {
		await this.getTestRun(req.params.id, req.params.workflowId, req.user);
		return await this.testCaseExecutionRepository.find({
			where: { testRun: { id: req.params.id } },
		});
	}
	async delete(req) {
		const { id: testRunId } = req.params;
		await this.getTestRun(req.params.id, req.params.workflowId, req.user);
		await this.testRunRepository.delete({ id: testRunId });
		this.telemetry.track('User deleted a run', { run_id: testRunId });
		return { success: true };
	}
	async cancel(req, res) {
		if (this.instanceSettings.isMultiMain) {
			throw new not_implemented_error_1.NotImplementedError(
				'Cancelling test runs is not yet supported in multi-main mode',
			);
		}
		const { id: testRunId } = req.params;
		const testRun = await this.getTestRun(req.params.id, req.params.workflowId, req.user);
		if (this.testRunnerService.canBeCancelled(testRun)) {
			const message = `The test run "${testRunId}" cannot be cancelled`;
			throw new conflict_error_1.ConflictError(message);
		}
		await this.testRunnerService.cancelTestRun(testRunId);
		res.status(202).json({ success: true });
	}
	async create(req, res) {
		const { workflowId } = req.params;
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, req.user, [
			'workflow:read',
		]);
		if (!workflow) {
			return res.status(404).json({ message: 'Not Found' });
		}
		void this.testRunnerService.runTest(req.user, workflow.id);
		return res.status(202).json({ success: true });
	}
};
exports.TestRunsController = TestRunsController;
__decorate(
	[
		(0, decorators_1.Get)('/:workflowId/test-runs', {
			middlewares: middlewares_1.listQueryMiddleware,
		}),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	TestRunsController.prototype,
	'getMany',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:workflowId/test-runs/:id'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	TestRunsController.prototype,
	'getOne',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:workflowId/test-runs/:id/test-cases'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	TestRunsController.prototype,
	'getTestCases',
	null,
);
__decorate(
	[
		(0, decorators_1.Delete)('/:workflowId/test-runs/:id'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	TestRunsController.prototype,
	'delete',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/:workflowId/test-runs/:id/cancel'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object]),
		__metadata('design:returntype', Promise),
	],
	TestRunsController.prototype,
	'cancel',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/:workflowId/test-runs/new'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object]),
		__metadata('design:returntype', Promise),
	],
	TestRunsController.prototype,
	'create',
	null,
);
exports.TestRunsController = TestRunsController = __decorate(
	[
		(0, decorators_1.RestController)('/workflows'),
		__metadata('design:paramtypes', [
			db_1.TestRunRepository,
			workflow_finder_service_1.WorkflowFinderService,
			db_1.TestCaseExecutionRepository,
			test_runner_service_ee_1.TestRunnerService,
			n8n_core_1.InstanceSettings,
			telemetry_1.Telemetry,
		]),
	],
	TestRunsController,
);
//# sourceMappingURL=test-runs.controller.ee.js.map
