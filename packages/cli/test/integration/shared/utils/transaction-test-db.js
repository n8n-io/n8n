'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.transactionTestDb = void 0;
exports.useTransactionForTest = useTransactionForTest;
const di_1 = require('@n8n/di');
class TransactionTestDb {
	constructor() {
		this.queryRunner = null;
		this.connection = null;
	}
	async startTransaction() {
		if (!this.connection) {
			this.connection = di_1.Container.get(DataSource);
		}
		if (this.queryRunner) {
			await this.rollbackTransaction();
		}
		this.queryRunner = this.connection.createQueryRunner();
		await this.queryRunner.connect();
		await this.queryRunner.startTransaction();
	}
	async rollbackTransaction() {
		if (this.queryRunner) {
			try {
				await this.queryRunner.rollbackTransaction();
			} catch (error) {
				console.warn('Transaction rollback warning:', error);
			} finally {
				await this.queryRunner.release();
				this.queryRunner = null;
			}
		}
	}
	getQueryRunner() {
		return this.queryRunner;
	}
	getConnection() {
		return this.connection;
	}
	async cleanup() {
		await this.rollbackTransaction();
		this.connection = null;
	}
}
exports.transactionTestDb = new TransactionTestDb();
function useTransactionForTest() {
	beforeEach(async () => {
		await exports.transactionTestDb.startTransaction();
	});
	afterEach(async () => {
		await exports.transactionTestDb.rollbackTransaction();
	});
	afterAll(async () => {
		await exports.transactionTestDb.cleanup();
	});
}
//# sourceMappingURL=transaction-test-db.js.map
