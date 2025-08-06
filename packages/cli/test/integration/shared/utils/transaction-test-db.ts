import { Container } from '@n8n/di';
import type { DataSource, QueryRunner } from '@n8n/typeorm';

/**
 * Transaction-based test isolation for faster test cleanup
 * Uses database transactions instead of table truncation
 */
class TransactionTestDb {
	private queryRunner: QueryRunner | null = null;
	private connection: DataSource | null = null;

	/**
	 * Start a transaction for test isolation
	 */
	async startTransaction(): Promise<void> {
		if (!this.connection) {
			this.connection = Container.get(DataSource);
		}

		if (this.queryRunner) {
			await this.rollbackTransaction();
		}

		this.queryRunner = this.connection.createQueryRunner();
		await this.queryRunner.connect();
		await this.queryRunner.startTransaction();
	}

	/**
	 * Rollback transaction to clean up test data
	 */
	async rollbackTransaction(): Promise<void> {
		if (this.queryRunner) {
			try {
				await this.queryRunner.rollbackTransaction();
			} catch (error) {
				// Transaction might already be rolled back
				console.warn('Transaction rollback warning:', error);
			} finally {
				await this.queryRunner.release();
				this.queryRunner = null;
			}
		}
	}

	/**
	 * Get the transaction query runner for test queries
	 */
	getQueryRunner(): QueryRunner | null {
		return this.queryRunner;
	}

	/**
	 * Get connection within transaction
	 */
	getConnection(): DataSource | null {
		return this.connection;
	}

	/**
	 * Cleanup all transactions
	 */
	async cleanup(): Promise<void> {
		await this.rollbackTransaction();
		this.connection = null;
	}
}

// Export singleton instance
export const transactionTestDb = new TransactionTestDb();

/**
 * Test helper for transaction-based test isolation
 */
export function useTransactionForTest() {
	beforeEach(async () => {
		await transactionTestDb.startTransaction();
	});

	afterEach(async () => {
		await transactionTestDb.rollbackTransaction();
	});

	afterAll(async () => {
		await transactionTestDb.cleanup();
	});
}
