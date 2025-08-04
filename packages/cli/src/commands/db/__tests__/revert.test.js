'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_common_1 = require('@n8n/backend-common');
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const jest_mock_extended_1 = require('jest-mock-extended');
const revert_1 = require('@/commands/db/revert');
const logger = (0, backend_test_utils_1.mockInstance)(backend_common_1.Logger);
afterEach(() => {
	jest.resetAllMocks();
});
test("don't revert migrations if there is no migration", async () => {
	const migrations = [];
	const dataSource = (0, jest_mock_extended_1.mock)({ migrations });
	const migrationExecutor = (0, jest_mock_extended_1.mock)();
	migrationExecutor.getExecutedMigrations.mockResolvedValue([]);
	await (0, revert_1.main)(logger, dataSource, migrationExecutor);
	expect(logger.error).toHaveBeenCalledTimes(1);
	expect(logger.error).toHaveBeenCalledWith(
		"Cancelled command. The database was never migrated. Are you sure you're connected to the right database?.",
	);
	expect(dataSource.undoLastMigration).not.toHaveBeenCalled();
	expect(dataSource.destroy).not.toHaveBeenCalled();
});
test("don't revert the last migration if it had no down migration", async () => {
	class TestMigration {
		constructor() {
			this.name = undefined;
			this.down = undefined;
		}
		async up() {}
	}
	const migrationsInCode = [new TestMigration()];
	const migrationsInDb = [{ id: 1, timestamp: Date.now(), name: 'TestMigration' }];
	const dataSource = (0, jest_mock_extended_1.mock)({ migrations: migrationsInCode });
	const migrationExecutor = (0, jest_mock_extended_1.mock)();
	migrationExecutor.getExecutedMigrations.mockResolvedValue(migrationsInDb);
	await (0, revert_1.main)(logger, dataSource, migrationExecutor);
	expect(logger.error).toHaveBeenCalledTimes(1);
	expect(logger.error).toBeCalledWith('Cancelled command. The last migration was irreversible.');
	expect(dataSource.undoLastMigration).not.toHaveBeenCalled();
	expect(dataSource.destroy).not.toHaveBeenCalled();
});
test('print migration name instead of class name in error message if the migration has a name', async () => {
	class TestMigration {
		constructor() {
			this.name = 'Migration Name';
			this.down = undefined;
		}
		async up() {}
	}
	const migrationsInCode = [new TestMigration()];
	const migrationsInDb = [{ id: 1, timestamp: Date.now(), name: 'Migration Name' }];
	const dataSource = (0, jest_mock_extended_1.mock)({ migrations: migrationsInCode });
	const migrationExecutor = (0, jest_mock_extended_1.mock)();
	migrationExecutor.getExecutedMigrations.mockResolvedValue(migrationsInDb);
	await (0, revert_1.main)(logger, dataSource, migrationExecutor);
	expect(logger.error).toHaveBeenCalledTimes(1);
	expect(logger.error).toHaveBeenCalledWith(
		'Cancelled command. The last migration "Migration Name" was irreversible.',
	);
	expect(dataSource.undoLastMigration).not.toHaveBeenCalled();
	expect(dataSource.destroy).not.toHaveBeenCalled();
});
test("don't revert the last migration if we cannot find the migration in the code", async () => {
	const migrationsInDb = [{ id: 1, timestamp: Date.now(), name: 'TestMigration' }];
	const dataSource = (0, jest_mock_extended_1.mock)({ migrations: [] });
	const migrationExecutor = (0, jest_mock_extended_1.mock)();
	migrationExecutor.getExecutedMigrations.mockResolvedValue(migrationsInDb);
	await (0, revert_1.main)(logger, dataSource, migrationExecutor);
	expect(logger.error).toHaveBeenCalledTimes(2);
	expect(logger.error).toHaveBeenNthCalledWith(
		1,
		'The last migration that was executed is "TestMigration", but I could not find that migration\'s code in the currently installed version of n8n.',
	);
	expect(logger.error).toHaveBeenNthCalledWith(
		2,
		'This usually means that you downgraded n8n before running `n8n db:revert`. Please upgrade n8n again and run `n8n db:revert` and then downgrade again.',
	);
	expect(dataSource.undoLastMigration).not.toHaveBeenCalled();
	expect(dataSource.destroy).not.toHaveBeenCalled();
});
test('revert the last migration if it has a down migration', async () => {
	class TestMigration {
		constructor() {
			this.name = 'ReversibleMigration';
		}
		async up() {}
		async down() {}
	}
	const migrationsInDb = [{ id: 1, timestamp: Date.now(), name: 'ReversibleMigration' }];
	const dataSource = (0, jest_mock_extended_1.mock)({ migrations: [new TestMigration()] });
	const migrationExecutor = (0, jest_mock_extended_1.mock)();
	migrationExecutor.getExecutedMigrations.mockResolvedValue(migrationsInDb);
	await (0, revert_1.main)(logger, dataSource, migrationExecutor);
	expect(logger.error).not.toHaveBeenCalled();
	expect(dataSource.undoLastMigration).toHaveBeenCalled();
	expect(dataSource.destroy).toHaveBeenCalled();
});
test("don't use transaction if the last migration has transaction = false", async () => {
	class TestMigration {
		constructor() {
			this.name = 'ReversibleMigration';
			this.transaction = false;
		}
		async up() {}
		async down() {}
	}
	const migrationsInDb = [{ id: 1, timestamp: Date.now(), name: 'ReversibleMigration' }];
	const dataSource = (0, jest_mock_extended_1.mock)({ migrations: [new TestMigration()] });
	const migrationExecutor = (0, jest_mock_extended_1.mock)();
	migrationExecutor.getExecutedMigrations.mockResolvedValue(migrationsInDb);
	await (0, revert_1.main)(logger, dataSource, migrationExecutor);
	expect(dataSource.undoLastMigration).toHaveBeenCalledWith({
		transaction: 'none',
	});
});
//# sourceMappingURL=revert.test.js.map
