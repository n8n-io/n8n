'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const typeorm_1 = require('@n8n/typeorm');
const jest_mock_1 = require('jest-mock');
const jest_mock_extended_1 = require('jest-mock-extended');
const config_2 = __importDefault(require('@/config'));
const event_service_1 = require('@/events/event.service');
const ownership_service_1 = require('@/services/ownership.service');
const user_service_1 = require('@/services/user.service');
const workflow_statistics_service_1 = require('@/services/workflow-statistics.service');
const users_1 = require('@test-integration/db/users');
describe('WorkflowStatisticsService', () => {
	describe('workflowExecutionCompleted', () => {
		let workflowStatisticsService;
		let workflowStatisticsRepository;
		let userService;
		let user;
		let personalProject;
		let workflow;
		beforeAll(async () => {
			await backend_test_utils_1.testDb.init();
			workflowStatisticsService = di_1.Container.get(
				workflow_statistics_service_1.WorkflowStatisticsService,
			);
			workflowStatisticsRepository = di_1.Container.get(db_1.WorkflowStatisticsRepository);
			userService = di_1.Container.get(user_service_1.UserService);
			user = await (0, users_1.createUser)();
			personalProject = await (0, backend_test_utils_1.getPersonalProject)(user);
			workflow = await (0, backend_test_utils_1.createWorkflow)({}, user);
		});
		afterAll(async () => {
			await backend_test_utils_1.testDb.terminate();
		});
		beforeEach(async () => {
			jest.restoreAllMocks();
			await backend_test_utils_1.testDb.truncate(['WorkflowStatistics']);
		});
		test.each(['cli', 'error', 'retry', 'trigger', 'webhook', 'evaluation'])(
			'should upsert `count` and `rootCount` for execution mode %s',
			async (mode) => {
				const runData = {
					finished: true,
					status: 'success',
					data: { resultData: { runData: {} } },
					mode,
					startedAt: new Date(),
				};
				await workflowStatisticsService.workflowExecutionCompleted(workflow, runData);
				await workflowStatisticsService.workflowExecutionCompleted(workflow, runData);
				const statistics = await workflowStatisticsRepository.find();
				expect(statistics).toHaveLength(1);
				expect(statistics[0]).toMatchObject({
					count: 2,
					rootCount: 2,
					latestEvent: expect.any(Date),
					name: 'production_success',
					workflowId: workflow.id,
				});
			},
		);
		test.each(['manual', 'integrated', 'internal'])(
			'should upsert `count`, but not `rootCount` for execution mode %s',
			async (mode) => {
				const runData = {
					finished: true,
					status: 'success',
					data: { resultData: { runData: {} } },
					mode,
					startedAt: new Date(),
				};
				await workflowStatisticsService.workflowExecutionCompleted(workflow, runData);
				await workflowStatisticsService.workflowExecutionCompleted(workflow, runData);
				const statistics = await workflowStatisticsRepository.find();
				expect(statistics).toHaveLength(1);
				expect(statistics[0]).toMatchObject({
					count: 2,
					rootCount: 0,
					latestEvent: expect.any(Date),
					name: mode === 'manual' ? 'manual_success' : 'production_success',
					workflowId: workflow.id,
				});
			},
		);
		test.each(['success', 'crashed', 'error'])(
			'should upsert `count` and `rootCount` for execution status %s',
			async (status) => {
				const runData = {
					finished: true,
					status,
					data: { resultData: { runData: {} } },
					mode: 'trigger',
					startedAt: new Date(),
				};
				await workflowStatisticsService.workflowExecutionCompleted(workflow, runData);
				await workflowStatisticsService.workflowExecutionCompleted(workflow, runData);
				const statistics = await workflowStatisticsRepository.find();
				expect(statistics).toHaveLength(1);
				expect(statistics[0]).toMatchObject({
					count: 2,
					rootCount: 2,
					latestEvent: expect.any(Date),
					name: status === 'success' ? 'production_success' : 'production_error',
					workflowId: workflow.id,
				});
			},
		);
		test.each(['canceled', 'new', 'running', 'unknown', 'waiting'])(
			'should upsert `count`, but not `rootCount` for execution status %s',
			async (status) => {
				const runData = {
					finished: true,
					status,
					data: { resultData: { runData: {} } },
					mode: 'trigger',
					startedAt: new Date(),
				};
				await workflowStatisticsService.workflowExecutionCompleted(workflow, runData);
				await workflowStatisticsService.workflowExecutionCompleted(workflow, runData);
				const statistics = await workflowStatisticsRepository.find();
				expect(statistics).toHaveLength(1);
				expect(statistics[0]).toMatchObject({
					count: 2,
					rootCount: 0,
					latestEvent: expect.any(Date),
					name: 'production_error',
					workflowId: workflow.id,
				});
			},
		);
		test('updates user settings and emit first-production-workflow-succeeded', async () => {
			const runData = {
				finished: true,
				status: 'success',
				data: { resultData: { runData: {} } },
				mode: 'internal',
				startedAt: new Date(),
			};
			const emitSpy = jest.spyOn(di_1.Container.get(event_service_1.EventService), 'emit');
			const updateSettingsSpy = jest.spyOn(userService, 'updateSettings');
			await workflowStatisticsService.workflowExecutionCompleted(workflow, runData);
			expect(updateSettingsSpy).toHaveBeenCalledTimes(1);
			expect(updateSettingsSpy).toHaveBeenCalledWith(user.id, {
				firstSuccessfulWorkflowId: workflow.id,
				userActivated: true,
				userActivatedAt: runData.startedAt.getTime(),
			});
			expect(emitSpy).toHaveBeenCalledTimes(1);
			expect(emitSpy).toHaveBeenCalledWith('first-production-workflow-succeeded', {
				projectId: personalProject.id,
				workflowId: workflow.id,
				userId: user.id,
			});
		});
		test('does not update user settings and does not emit first-production-workflow-succeeded for failing executions', async () => {
			const runData = {
				finished: false,
				status: 'error',
				data: { resultData: { runData: {} } },
				mode: 'internal',
				startedAt: new Date(),
			};
			const emitSpy = jest.spyOn(di_1.Container.get(event_service_1.EventService), 'emit');
			const updateSettingsSpy = jest.spyOn(userService, 'updateSettings');
			await workflowStatisticsService.workflowExecutionCompleted(workflow, runData);
			expect(updateSettingsSpy).not.toHaveBeenCalled();
			expect(emitSpy).not.toHaveBeenCalled();
		});
		test('does not update user settings and does not emit first-production-workflow-succeeded for successive executions', async () => {
			const runData = {
				finished: true,
				status: 'success',
				data: { resultData: { runData: {} } },
				mode: 'internal',
				startedAt: new Date(),
			};
			await workflowStatisticsService.workflowExecutionCompleted(workflow, runData);
			const emitSpy = jest.spyOn(di_1.Container.get(event_service_1.EventService), 'emit');
			const updateSettingsSpy = jest.spyOn(
				di_1.Container.get(user_service_1.UserService),
				'updateSettings',
			);
			await workflowStatisticsService.workflowExecutionCompleted(workflow, runData);
			expect(updateSettingsSpy).not.toHaveBeenCalled();
			expect(emitSpy).not.toHaveBeenCalled();
		});
	});
	describe('nodeFetchedData', () => {
		let workflowStatisticsService;
		let eventService;
		let user;
		let project;
		let ownershipService;
		let entityManager;
		let userService;
		let workflowStatisticsRepository;
		beforeAll(() => {
			user = (0, jest_mock_extended_1.mock)({ id: 'abcde-fghij' });
			project = (0, jest_mock_extended_1.mock)({ id: '12345-67890', type: 'personal' });
			ownershipService = (0, backend_test_utils_1.mockInstance)(
				ownership_service_1.OwnershipService,
			);
			userService = (0, backend_test_utils_1.mockInstance)(user_service_1.UserService);
			const globalConfig = di_1.Container.get(config_1.GlobalConfig);
			entityManager = (0, jest_mock_extended_1.mock)();
			const dataSource = (0, jest_mock_extended_1.mock)({
				manager: entityManager,
				getMetadata: () =>
					(0, jest_mock_extended_1.mock)({
						tableName: 'workflow_statistics',
					}),
				driver: { escape: jest.fn((id) => id) },
			});
			Object.assign(entityManager, { connection: dataSource });
			eventService = (0, jest_mock_extended_1.mock)();
			workflowStatisticsRepository = new db_1.WorkflowStatisticsRepository(
				dataSource,
				globalConfig,
			);
			workflowStatisticsService = new workflow_statistics_service_1.WorkflowStatisticsService(
				(0, jest_mock_extended_1.mock)(),
				workflowStatisticsRepository,
				ownershipService,
				userService,
				eventService,
			);
			globalConfig.diagnostics.enabled = true;
			config_2.default.set('deployment.type', 'n8n-testing');
			(0, jest_mock_1.mocked)(ownershipService.getWorkflowProjectCached).mockResolvedValue(project);
			(0, jest_mock_1.mocked)(ownershipService.getPersonalProjectOwnerCached).mockResolvedValue(
				user,
			);
		});
		afterAll(() => {
			jest.resetAllMocks();
		});
		beforeEach(() => {
			jest.clearAllMocks();
		});
		test('should create metrics when the db is updated', async () => {
			const workflowId = '1';
			const node = {
				id: 'abcde',
				name: 'test node',
				typeVersion: 1,
				type: '',
				position: [0, 0],
				parameters: {},
			};
			await workflowStatisticsService.nodeFetchedData(workflowId, node);
			expect(eventService.emit).toHaveBeenCalledWith('first-workflow-data-loaded', {
				userId: user.id,
				project: project.id,
				workflowId,
				nodeType: node.type,
				nodeId: node.id,
			});
		});
		test('should emit event with no `userId` if workflow is owned by team project', async () => {
			const workflowId = '123';
			(0, jest_mock_1.mocked)(ownershipService.getPersonalProjectOwnerCached).mockResolvedValueOnce(
				null,
			);
			const node = (0, jest_mock_extended_1.mock)({
				id: '123',
				type: 'n8n-nodes-base.noOp',
				credentials: {},
			});
			await workflowStatisticsService.nodeFetchedData(workflowId, node);
			expect(eventService.emit).toHaveBeenCalledWith('first-workflow-data-loaded', {
				userId: '',
				project: project.id,
				workflowId,
				nodeType: node.type,
				nodeId: node.id,
			});
		});
		test('should create metrics with credentials when the db is updated', async () => {
			const workflowId = '1';
			const node = {
				id: 'abcde',
				name: 'test node',
				typeVersion: 1,
				type: '',
				position: [0, 0],
				parameters: {},
				credentials: {
					testCredentials: {
						id: '1',
						name: 'Test Credentials',
					},
				},
			};
			await workflowStatisticsService.nodeFetchedData(workflowId, node);
			expect(eventService.emit).toHaveBeenCalledWith('first-workflow-data-loaded', {
				userId: user.id,
				project: project.id,
				workflowId,
				nodeType: node.type,
				nodeId: node.id,
				credentialType: 'testCredentials',
				credentialId: node.credentials.testCredentials.id,
			});
		});
		test('should not send metrics for entries that already have the flag set', async () => {
			(0, jest_mock_1.mocked)(entityManager.insert).mockRejectedValueOnce(
				new typeorm_1.QueryFailedError('', undefined, new Error()),
			);
			const workflowId = '1';
			const node = {
				id: 'abcde',
				name: 'test node',
				typeVersion: 1,
				type: '',
				position: [0, 0],
				parameters: {},
			};
			await workflowStatisticsService.nodeFetchedData(workflowId, node);
			expect(eventService.emit).not.toHaveBeenCalled();
		});
	});
});
//# sourceMappingURL=workflow-statistics.service.test.js.map
