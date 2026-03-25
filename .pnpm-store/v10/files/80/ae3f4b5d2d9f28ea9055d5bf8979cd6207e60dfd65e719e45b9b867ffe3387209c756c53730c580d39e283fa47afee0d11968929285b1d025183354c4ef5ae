import { EntityManager } from "../../entity-manager/EntityManager";
import { DataSource } from "../../data-source/DataSource";
import { QueryRunner } from "../../query-runner/QueryRunner";
/**
 * TransactionCommitEvent is an object that broadcaster sends to the entity subscriber when an transaction is committed.
 */
export interface TransactionCommitEvent {
    /**
     * Connection used in the event.
     */
    connection: DataSource;
    /**
     * QueryRunner used in the event transaction.
     * All database operations in the subscribed event listener should be performed using this query runner instance.
     */
    queryRunner: QueryRunner;
    /**
     * EntityManager used in the event transaction.
     * All database operations in the subscribed event listener should be performed using this entity manager instance.
     */
    manager: EntityManager;
}
