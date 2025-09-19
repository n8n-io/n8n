import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { IrreversibleMigration, ReversibleMigration } from '@n8n/db';
import type { Migration, MigrationExecutor, DataSource } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';

import { main } from '@/commands/db/revert';

const logger = mockInstance(Logger);

afterEach(() => {
	jest.resetAllMocks();
});

test("don't revert migrations if there is no migration", async () => {
	//
	// ARRANGE
	//
	const migrations: Migration[] = [];
	const dataSource = mock<DataSource>({ migrations });
	const migrationExecutor = mock<MigrationExecutor>();
	migrationExecutor.getExecutedMigrations.mockResolvedValue([]);

	//
	// ACT
	//
	await main(logger, dataSource, migrationExecutor);

	//
	// ASSERT
	//
	expect(logger.error).toHaveBeenCalledTimes(1);
	expect(logger.error).toHaveBeenCalledWith(
		"Cancelled command. The database was never migrated. Are you sure you're connected to the right database?.",
	);
	expect(dataSource.undoLastMigration).not.toHaveBeenCalled();
	expect(dataSource.destroy).not.toHaveBeenCalled();
});

test("don't revert the last migration if it had no down migration", async () => {
	//
	// ARRANGE
	//
	class TestMigration implements IrreversibleMigration {
		name = undefined;

		async up() {}

		down = undefined;
	}

	const migrationsInCode = [new TestMigration()];
	const migrationsInDb: Migration[] = [{ id: 1, timestamp: Date.now(), name: 'TestMigration' }];
	const dataSource = mock<DataSource>({ migrations: migrationsInCode });

	const migrationExecutor = mock<MigrationExecutor>();
	migrationExecutor.getExecutedMigrations.mockResolvedValue(migrationsInDb);

	//
	// ACT
	//
	await main(logger, dataSource, migrationExecutor);

	//
	// ASSERT
	//
	expect(logger.error).toHaveBeenCalledTimes(1);
	expect(logger.error).toBeCalledWith('Cancelled command. The last migration was irreversible.');
	expect(dataSource.undoLastMigration).not.toHaveBeenCalled();
	expect(dataSource.destroy).not.toHaveBeenCalled();
});

test('print migration name instead of class name in error message if the migration has a name', async () => {
	//
	// ARRANGE
	//
	class TestMigration implements IrreversibleMigration {
		name = 'Migration Name';

		async up() {}

		down = undefined;
	}

	const migrationsInCode = [new TestMigration()];
	const migrationsInDb: Migration[] = [{ id: 1, timestamp: Date.now(), name: 'Migration Name' }];
	const dataSource = mock<DataSource>({ migrations: migrationsInCode });

	const migrationExecutor = mock<MigrationExecutor>();
	migrationExecutor.getExecutedMigrations.mockResolvedValue(migrationsInDb);

	//
	// ACT
	//
	await main(logger, dataSource, migrationExecutor);

	//
	// ASSERT
	//
	expect(logger.error).toHaveBeenCalledTimes(1);
	expect(logger.error).toHaveBeenCalledWith(
		'Cancelled command. The last migration "Migration Name" was irreversible.',
	);
	expect(dataSource.undoLastMigration).not.toHaveBeenCalled();
	expect(dataSource.destroy).not.toHaveBeenCalled();
});

test("don't revert the last migration if we cannot find the migration in the code", async () => {
	//
	// ARRANGE
	//

	const migrationsInDb: Migration[] = [{ id: 1, timestamp: Date.now(), name: 'TestMigration' }];
	const dataSource = mock<DataSource>({ migrations: [] });

	const migrationExecutor = mock<MigrationExecutor>();
	migrationExecutor.getExecutedMigrations.mockResolvedValue(migrationsInDb);

	//
	// ACT
	//
	await main(logger, dataSource, migrationExecutor);

	//
	// ASSERT
	//
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
	//
	// ARRANGE
	//
	class TestMigration implements ReversibleMigration {
		name = 'ReversibleMigration';

		async up() {}

		async down() {}
	}

	const migrationsInDb: Migration[] = [
		{ id: 1, timestamp: Date.now(), name: 'ReversibleMigration' },
	];
	const dataSource = mock<DataSource>({ migrations: [new TestMigration()] });

	const migrationExecutor = mock<MigrationExecutor>();
	migrationExecutor.getExecutedMigrations.mockResolvedValue(migrationsInDb);

	//
	// ACT
	//
	await main(logger, dataSource, migrationExecutor);

	//
	// ASSERT
	//
	expect(logger.error).not.toHaveBeenCalled();
	expect(dataSource.undoLastMigration).toHaveBeenCalled();
	expect(dataSource.destroy).toHaveBeenCalled();
});

test("don't use transaction if the last migration has transaction = false", async () => {
	//
	// ARRANGE
	//
	class TestMigration implements ReversibleMigration {
		name = 'ReversibleMigration';

		transaction = false as const;

		async up() {}

		async down() {}
	}

	const migrationsInDb: Migration[] = [
		{ id: 1, timestamp: Date.now(), name: 'ReversibleMigration' },
	];
	const dataSource = mock<DataSource>({ migrations: [new TestMigration()] });

	const migrationExecutor = mock<MigrationExecutor>();
	migrationExecutor.getExecutedMigrations.mockResolvedValue(migrationsInDb);

	//
	// ACT
	//
	await main(logger, dataSource, migrationExecutor);

	//
	// ASSERT
	//
	expect(dataSource.undoLastMigration).toHaveBeenCalledWith({
		transaction: 'none',
	});
});
