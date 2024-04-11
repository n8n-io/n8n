import { main } from '@/commands/db/revert';
import { mockInstance } from '../../../shared/mocking';
import { Logger } from '@/Logger';
import * as DbConfig from '@db/config';
import type { IrreversibleMigration, ReversibleMigration } from '@/databases/types';
import type { DataSource } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';

const logger = mockInstance(Logger);

afterEach(() => {
	jest.resetAllMocks();
});

test("don't revert migrations if there is no migration", async () => {
	//
	// ARRANGE
	//
	const connectionOptions = DbConfig.getConnectionOptions();
	// @ts-expect-error property is readonly
	connectionOptions.migrations = [];
	const dataSource = mock<DataSource>({ migrations: [] });

	//
	// ACT
	//
	await main(connectionOptions, logger, function () {
		return dataSource;
	} as never);

	//
	// ASSERT
	//
	expect(logger.error).toHaveBeenCalledTimes(1);
	expect(logger.error).toHaveBeenCalledWith('There is no migration to reverse.');
	expect(dataSource.undoLastMigration).not.toHaveBeenCalled();
	expect(dataSource.destroy).not.toHaveBeenCalled();
});

test("don't revert the last migration if it had no down migration", async () => {
	//
	// ARRANGE
	//
	class TestMigration implements IrreversibleMigration {
		async up() {}
	}

	const connectionOptions = DbConfig.getConnectionOptions();
	const migrations = [TestMigration];
	// @ts-expect-error property is readonly
	connectionOptions.migrations = migrations;
	const dataSource = mock<DataSource>();
	// @ts-expect-error property is readonly, and I can't pass them the `mock`
	// because `mock` will mock the down method and thus defeat the purpose
	// of this test, because the tested code will assume that the migration has a
	// down method.
	dataSource.migrations = migrations.map((M) => new M());

	//
	// ACT
	//
	await main(connectionOptions, logger, function () {
		return dataSource;
	} as never);

	//
	// ASSERT
	//
	expect(logger.error).toHaveBeenCalledTimes(1);
	expect(logger.error).toHaveBeenCalledWith(
		'The last migration was irreversible and cannot be reverted.',
	);
	expect(dataSource.undoLastMigration).not.toHaveBeenCalled();
	expect(dataSource.destroy).not.toHaveBeenCalled();
});

test('revert the last migration if it has a down migration', async () => {
	//
	// ARRANGE
	//
	class TestMigration implements ReversibleMigration {
		async up() {}

		async down() {}
	}

	const connectionOptions = DbConfig.getConnectionOptions();
	// @ts-expect-error property is readonly
	connectionOptions.migrations = [TestMigration];
	const dataSource = mock<DataSource>({ migrations: [new TestMigration()] });

	//
	// ACT
	//
	await main(connectionOptions, logger, function () {
		return dataSource;
	} as never);

	//
	// ASSERT
	//
	expect(logger.error).not.toHaveBeenCalled();
	expect(dataSource.undoLastMigration).toHaveBeenCalled();
	expect(dataSource.destroy).toHaveBeenCalled();
});

test('throw if a migration is invalid, e.g. has no `up` method', async () => {
	//
	// ARRANGE
	//
	class TestMigration {}

	const connectionOptions = DbConfig.getConnectionOptions();
	// @ts-expect-error property is readonly
	connectionOptions.migrations = [TestMigration];
	const dataSource = mock<DataSource>({ migrations: [new TestMigration()] });

	//
	// ACT
	//
	await expect(
		main(connectionOptions, logger, function () {
			return dataSource;
		} as never),
	).rejects.toThrowError(
		'At least on migration is missing the method `up`. Make sure all migrations are valid.',
	);

	//
	// ASSERT
	//
	expect(dataSource.undoLastMigration).not.toHaveBeenCalled();
	expect(dataSource.destroy).not.toHaveBeenCalled();
});
