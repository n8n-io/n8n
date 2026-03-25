import { QueryRunner } from "../query-runner/QueryRunner";
/**
 * Migrations should implement this interface and all its methods.
 */
export interface MigrationInterface {
    /**
     * Optional migration name, defaults to class name.
     */
    name?: string;
    /**
     * Optional flag to determine whether to run the migration in a transaction or not.
     * Can only be used when `migrationsTransactionMode` is either "each" or "none"
     * Defaults to `true` when `migrationsTransactionMode` is "each"
     * Defaults to `false` when `migrationsTransactionMode` is "none"
     */
    transaction?: boolean;
    /**
     * Run the migrations.
     */
    up(queryRunner: QueryRunner): Promise<any>;
    /**
     * Reverse the migrations.
     */
    down(queryRunner: QueryRunner): Promise<any>;
}
