'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_core_1 = require('n8n-core');
const utils_1 = require('n8n-core/test/utils');
const n8n_workflow_1 = require('n8n-workflow');
const credentials_helper_1 = require('@/credentials-helper');
const variables_service_ee_1 = require('@/environments.ee/variables/variables.service.ee');
const external_hooks_1 = require('@/external-hooks');
const workflow_statistics_service_1 = require('@/services/workflow-statistics.service');
const WorkflowExecuteAdditionalData = __importStar(require('@/workflow-execute-additional-data'));
const workflow_static_data_service_1 = require('@/workflows/workflow-static-data.service');
const job_processor_1 = require('../job-processor');
(0, utils_1.mockInstance)(variables_service_ee_1.VariablesService, {
	getAllCached: jest.fn().mockResolvedValue([]),
});
(0, utils_1.mockInstance)(credentials_helper_1.CredentialsHelper);
(0, utils_1.mockInstance)(n8n_core_1.ExternalSecretsProxy);
(0, utils_1.mockInstance)(workflow_static_data_service_1.WorkflowStaticDataService);
(0, utils_1.mockInstance)(workflow_statistics_service_1.WorkflowStatisticsService);
(0, utils_1.mockInstance)(external_hooks_1.ExternalHooks);
const processRunExecutionDataMock = jest.fn();
jest.mock('n8n-core', () => {
	const original = jest.requireActual('n8n-core');
	return {
		...original,
		WorkflowExecute: jest.fn().mockImplementation(() => ({
			processRunExecutionData: processRunExecutionDataMock,
		})),
	};
});
const logger = (0, jest_mock_extended_1.mock)({
	scoped: jest.fn().mockImplementation(() => logger),
});
describe('JobProcessor', () => {
	it('should refrain from processing a crashed execution', async () => {
		const executionRepository = (0, jest_mock_extended_1.mock)();
		executionRepository.findSingleExecution.mockResolvedValue(
			(0, jest_mock_extended_1.mock)({ status: 'crashed' }),
		);
		const jobProcessor = new job_processor_1.JobProcessor(
			logger,
			executionRepository,
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
		);
		const result = await jobProcessor.processJob((0, jest_mock_extended_1.mock)());
		expect(result).toEqual({ success: false });
	});
	it.each(['manual', 'evaluation'])(
		'should use manualExecutionService to process a job in %p mode',
		async (mode) => {
			const executionRepository = (0, jest_mock_extended_1.mock)();
			executionRepository.findSingleExecution.mockResolvedValue(
				(0, jest_mock_extended_1.mock)({
					mode,
					workflowData: { nodes: [] },
					data: (0, jest_mock_extended_1.mock)({
						executionData: undefined,
					}),
				}),
			);
			const manualExecutionService = (0, jest_mock_extended_1.mock)();
			const jobProcessor = new job_processor_1.JobProcessor(
				logger,
				executionRepository,
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				manualExecutionService,
			);
			await jobProcessor.processJob((0, jest_mock_extended_1.mock)());
			expect(manualExecutionService.runManually).toHaveBeenCalledTimes(1);
		},
	);
	it('should pass additional data for partial executions to run', async () => {
		const executionRepository = (0, jest_mock_extended_1.mock)();
		const pinData = { pinned: [] };
		const execution = (0, jest_mock_extended_1.mock)({
			mode: 'manual',
			workflowData: { nodes: [], pinData },
			data: (0, jest_mock_extended_1.mock)({
				resultData: {
					runData: {
						trigger: [(0, jest_mock_extended_1.mock)({ executionIndex: 1 })],
						node: [
							(0, jest_mock_extended_1.mock)({ executionIndex: 3 }),
							(0, jest_mock_extended_1.mock)({ executionIndex: 4 }),
						],
					},
					pinData,
				},
				executionData: undefined,
			}),
		});
		executionRepository.findSingleExecution.mockResolvedValue(execution);
		const additionalData = (0, jest_mock_extended_1.mock)();
		jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(additionalData);
		const manualExecutionService = (0, jest_mock_extended_1.mock)();
		const jobProcessor = new job_processor_1.JobProcessor(
			logger,
			executionRepository,
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			manualExecutionService,
		);
		const executionId = 'execution-id';
		await jobProcessor.processJob(
			(0, jest_mock_extended_1.mock)({ data: { executionId, loadStaticData: false } }),
		);
		expect(WorkflowExecuteAdditionalData.getBase).toHaveBeenCalledWith(
			undefined,
			undefined,
			undefined,
		);
		expect(manualExecutionService.runManually).toHaveBeenCalledWith(
			expect.objectContaining({
				executionMode: 'manual',
			}),
			expect.any(n8n_workflow_1.Workflow),
			additionalData,
			executionId,
			pinData,
		);
	});
	it.each(['manual', 'evaluation', 'trigger'])(
		'should use workflowExecute to process a job with mode %p with execution data',
		async (mode) => {
			const { WorkflowExecute } = await Promise.resolve().then(() =>
				__importStar(require('n8n-core')),
			);
			const MockedWorkflowExecute = WorkflowExecute;
			MockedWorkflowExecute.mockClear();
			const executionRepository = (0, jest_mock_extended_1.mock)();
			const executionData = (0, jest_mock_extended_1.mock)({
				startData: undefined,
				executionData: {
					nodeExecutionStack: [
						{
							node: { name: 'node-name' },
						},
					],
				},
			});
			executionRepository.findSingleExecution.mockResolvedValue(
				(0, jest_mock_extended_1.mock)({
					mode,
					workflowData: { nodes: [] },
					data: executionData,
				}),
			);
			const additionalData = (0, jest_mock_extended_1.mock)();
			jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(additionalData);
			const manualExecutionService = (0, jest_mock_extended_1.mock)();
			const jobProcessor = new job_processor_1.JobProcessor(
				logger,
				executionRepository,
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				manualExecutionService,
			);
			await jobProcessor.processJob((0, jest_mock_extended_1.mock)());
			expect(MockedWorkflowExecute).toHaveBeenCalledWith(additionalData, mode, executionData);
			expect(processRunExecutionDataMock).toHaveBeenCalled();
		},
	);
});
//# sourceMappingURL=job-processor.service.test.js.map
