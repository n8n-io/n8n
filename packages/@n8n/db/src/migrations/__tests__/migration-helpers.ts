import { wrapMigration } from '../migration-helpers';
import type { IrreversibleMigration, ReversibleMigration } from '../migration-types';

describe('migrationHelpers.wrapMigration', () => {
	test('throws if passed a migration without up method', async () => {
		//
		// ARRANGE
		//
		class TestMigration {}

		//
		// ACT & ASSERT
		//
		expect(() => wrapMigration(TestMigration as never)).toThrow(
			'Migration "TestMigration" is missing the method `up`.',
		);
	});

	test('wraps up method', async () => {
		//
		// ARRANGE
		//
		class TestMigration implements IrreversibleMigration {
			async up() {}
		}
		const originalUp = jest.fn();
		TestMigration.prototype.up = originalUp;

		//
		// ACT
		//
		wrapMigration(TestMigration);
		await new TestMigration().up();

		//
		// ASSERT
		//
		expect(TestMigration.prototype.up).not.toBe(originalUp);
		expect(originalUp).toHaveBeenCalledTimes(1);
	});

	test('wraps down method', async () => {
		//
		// ARRANGE
		//
		class TestMigration implements ReversibleMigration {
			async up() {}

			async down() {}
		}
		const originalDown = jest.fn();
		TestMigration.prototype.down = originalDown;

		//
		// ACT
		//
		wrapMigration(TestMigration);
		await new TestMigration().down();

		//
		// ASSERT
		//
		expect(TestMigration.prototype.down).not.toBe(originalDown);
		expect(originalDown).toHaveBeenCalledTimes(1);
	});
});
