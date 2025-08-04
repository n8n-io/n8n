'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const jest_mock_extended_1 = require('jest-mock-extended');
const executions_pruning_service_1 = require('../executions-pruning.service');
describe('PruningService', () => {
	const dbConnection = (0, jest_mock_extended_1.mock)({
		connectionState: { migrated: true },
	});
	describe('init', () => {
		it('should start pruning on main instance that is the leader', () => {
			const pruningService = new executions_pruning_service_1.ExecutionsPruningService(
				(0, backend_test_utils_1.mockLogger)(),
				(0, jest_mock_extended_1.mock)({ isLeader: true, isMultiMain: true }),
				dbConnection,
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
			);
			const startPruningSpy = jest.spyOn(pruningService, 'startPruning');
			pruningService.init();
			expect(startPruningSpy).toHaveBeenCalled();
		});
		it('should not start pruning on main instance that is a follower', () => {
			const pruningService = new executions_pruning_service_1.ExecutionsPruningService(
				(0, backend_test_utils_1.mockLogger)(),
				(0, jest_mock_extended_1.mock)({ isLeader: false, isMultiMain: true }),
				dbConnection,
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
			);
			const startPruningSpy = jest.spyOn(pruningService, 'startPruning');
			pruningService.init();
			expect(startPruningSpy).not.toHaveBeenCalled();
		});
	});
	describe('isEnabled', () => {
		it('should return `true` based on config if leader main', () => {
			const pruningService = new executions_pruning_service_1.ExecutionsPruningService(
				(0, backend_test_utils_1.mockLogger)(),
				(0, jest_mock_extended_1.mock)({ isLeader: true, instanceType: 'main', isMultiMain: true }),
				dbConnection,
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)({ pruneData: true }),
			);
			expect(pruningService.isEnabled).toBe(true);
		});
		it('should return `false` based on config if leader main', () => {
			const pruningService = new executions_pruning_service_1.ExecutionsPruningService(
				(0, backend_test_utils_1.mockLogger)(),
				(0, jest_mock_extended_1.mock)({ isLeader: true, instanceType: 'main', isMultiMain: true }),
				dbConnection,
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)({ pruneData: false }),
			);
			expect(pruningService.isEnabled).toBe(false);
		});
		it('should return `false` if non-main even if config is enabled', () => {
			const pruningService = new executions_pruning_service_1.ExecutionsPruningService(
				(0, backend_test_utils_1.mockLogger)(),
				(0, jest_mock_extended_1.mock)({
					isLeader: false,
					instanceType: 'worker',
					isMultiMain: true,
				}),
				dbConnection,
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)({ pruneData: true }),
			);
			expect(pruningService.isEnabled).toBe(false);
		});
		it('should return `false` if follower main even if config is enabled', () => {
			const pruningService = new executions_pruning_service_1.ExecutionsPruningService(
				(0, backend_test_utils_1.mockLogger)(),
				(0, jest_mock_extended_1.mock)({
					isLeader: false,
					isFollower: true,
					instanceType: 'main',
					isMultiMain: true,
				}),
				dbConnection,
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)({ pruneData: true }),
			);
			expect(pruningService.isEnabled).toBe(false);
		});
	});
	describe('startPruning', () => {
		it('should not start pruning if service is disabled', () => {
			const pruningService = new executions_pruning_service_1.ExecutionsPruningService(
				(0, backend_test_utils_1.mockLogger)(),
				(0, jest_mock_extended_1.mock)({ isLeader: true, instanceType: 'main', isMultiMain: true }),
				dbConnection,
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)({ pruneData: false }),
			);
			const scheduleRollingSoftDeletionsSpy = jest.spyOn(
				pruningService,
				'scheduleRollingSoftDeletions',
			);
			const scheduleNextHardDeletionSpy = jest.spyOn(pruningService, 'scheduleNextHardDeletion');
			pruningService.startPruning();
			expect(scheduleRollingSoftDeletionsSpy).not.toHaveBeenCalled();
			expect(scheduleNextHardDeletionSpy).not.toHaveBeenCalled();
		});
		it('should start pruning if service is enabled and DB is migrated', () => {
			const pruningService = new executions_pruning_service_1.ExecutionsPruningService(
				(0, backend_test_utils_1.mockLogger)(),
				(0, jest_mock_extended_1.mock)({ isLeader: true, instanceType: 'main', isMultiMain: true }),
				dbConnection,
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)({ pruneData: true }),
			);
			const scheduleRollingSoftDeletionsSpy = jest
				.spyOn(pruningService, 'scheduleRollingSoftDeletions')
				.mockImplementation();
			const scheduleNextHardDeletionSpy = jest
				.spyOn(pruningService, 'scheduleNextHardDeletion')
				.mockImplementation();
			pruningService.startPruning();
			expect(scheduleRollingSoftDeletionsSpy).toHaveBeenCalled();
			expect(scheduleNextHardDeletionSpy).toHaveBeenCalled();
		});
	});
});
//# sourceMappingURL=executions-pruning.service.test.js.map
