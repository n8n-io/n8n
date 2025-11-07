import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { WorkspaceBalance } from '../entities';

/**
 * Repository for managing workspace balance operations.
 * Handles balance queries, deductions, additions, and low balance checks with proper transaction management.
 */
@Service()
export class WorkspaceBalanceRepository extends Repository<WorkspaceBalance> {
	constructor(dataSource: DataSource) {
		super(WorkspaceBalance, dataSource.manager);
	}

	/**
	 * Get the current balance for a workspace.
	 *
	 * @param workspaceId - The ID of the workspace
	 * @returns The workspace balance entity or null if not found
	 */
	async getBalance(workspaceId: string): Promise<WorkspaceBalance | null> {
		return await this.findOne({
			where: { workspaceId },
		});
	}

	/**
	 * Deduct balance from a workspace with pessimistic locking.
	 *
	 * This method uses SERIALIZABLE transaction isolation level and pessimistic_write locking
	 * to prevent race conditions during concurrent balance deductions. The lock ensures that
	 * only one transaction can modify the balance at a time, preventing overselling.
	 *
	 * Process flow:
	 * 1. Starts a SERIALIZABLE transaction
	 * 2. Locks the balance row with FOR UPDATE
	 * 3. Validates balance exists and is sufficient
	 * 4. Deducts the amount and saves
	 * 5. Commits transaction or rolls back on error
	 *
	 * @param workspaceId - The ID of the workspace
	 * @param amount - The amount to deduct (must be positive)
	 * @returns Object with success status, new balance on success, or error message on failure
	 */
	async deductBalance(
		workspaceId: string,
		amount: number,
	): Promise<{ success: boolean; newBalance?: number; error?: string }> {
		const queryRunner = this.manager.connection.createQueryRunner();

		await queryRunner.connect();
		await queryRunner.startTransaction('SERIALIZABLE');

		try {
			// Lock the row with pessimistic_write to prevent concurrent modifications
			const balance = await queryRunner.manager.findOne(WorkspaceBalance, {
				where: { workspaceId },
				lock: { mode: 'pessimistic_write' },
			});

			// Check if balance exists
			if (!balance) {
				await queryRunner.rollbackTransaction();
				return {
					success: false,
					error: `Balance not found for workspace: ${workspaceId}`,
				};
			}

			// Check if balance is sufficient
			if (balance.balanceCny < amount) {
				await queryRunner.rollbackTransaction();
				return {
					success: false,
					error: `Insufficient balance. Current: ${balance.balanceCny}, Required: ${amount}`,
				};
			}

			// Deduct the amount
			balance.balanceCny -= amount;

			// Save the updated balance
			await queryRunner.manager.save(balance);

			// Commit the transaction
			await queryRunner.commitTransaction();

			return {
				success: true,
				newBalance: balance.balanceCny,
			};
		} catch (error) {
			await queryRunner.rollbackTransaction();
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred',
			};
		} finally {
			await queryRunner.release();
		}
	}

	/**
	 * Add balance to a workspace (for recharges).
	 *
	 * This method uses a transaction to ensure consistency. If the balance record
	 * doesn't exist, it will be created with the specified amount.
	 *
	 * @param workspaceId - The ID of the workspace
	 * @param amount - The amount to add (must be positive)
	 * @returns The updated or created workspace balance entity
	 */
	async addBalance(workspaceId: string, amount: number): Promise<WorkspaceBalance> {
		const queryRunner = this.manager.connection.createQueryRunner();

		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			// Try to find existing balance
			let balance = await queryRunner.manager.findOne(WorkspaceBalance, {
				where: { workspaceId },
			});

			if (balance) {
				// Update existing balance
				balance.balanceCny += amount;
			} else {
				// Create new balance record
				balance = queryRunner.manager.create(WorkspaceBalance, {
					workspaceId,
					balanceCny: amount,
					lowBalanceThresholdCny: 10.0, // Default threshold
					currency: 'CNY',
				});
			}

			// Save the balance
			await queryRunner.manager.save(balance);

			// Commit the transaction
			await queryRunner.commitTransaction();

			return balance;
		} catch (error) {
			await queryRunner.rollbackTransaction();
			throw error;
		} finally {
			await queryRunner.release();
		}
	}

	/**
	 * Check if a workspace has low balance.
	 *
	 * Returns true if the current balance is below the low balance threshold.
	 *
	 * @param workspaceId - The ID of the workspace
	 * @returns True if balance is low, false if sufficient or not found
	 */
	async checkLowBalance(workspaceId: string): Promise<boolean> {
		const balance = await this.findOne({
			where: { workspaceId },
		});

		if (!balance) {
			return false;
		}

		return balance.balanceCny < balance.lowBalanceThresholdCny;
	}

	/**
	 * Get all workspaces with low balance.
	 *
	 * Returns all workspace balance records where the current balance is below
	 * the configured low balance threshold.
	 *
	 * @returns Array of workspace balance entities with low balance
	 */
	async getAllLowBalanceWorkspaces(): Promise<WorkspaceBalance[]> {
		return await this.createQueryBuilder('workspace_balance')
			.where('workspace_balance.balanceCny < workspace_balance.lowBalanceThresholdCny')
			.getMany();
	}
}
