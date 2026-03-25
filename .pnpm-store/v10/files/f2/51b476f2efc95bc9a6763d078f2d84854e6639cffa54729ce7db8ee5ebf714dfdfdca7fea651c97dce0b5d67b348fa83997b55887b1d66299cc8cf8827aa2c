import { EntityManager } from "../../entity-manager/EntityManager";
import { DataSource } from "../../data-source/DataSource";
import { QueryRunner } from "../../query-runner/QueryRunner";
/**
 * BeforeQueryEvent is an object that broadcaster sends to the entity subscriber before query is ran against the database.
 */
export interface QueryEvent<Entity> {
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
    /**
     * Query that is being executed.
     */
    query: string;
    /**
     * Parameters used in the query.
     */
    parameters?: any[];
}
export interface BeforeQueryEvent<Entity> extends QueryEvent<Entity> {
}
export interface AfterQueryEvent<Entity> extends QueryEvent<Entity> {
    /**
     * Whether the query was successful.
     */
    success: boolean;
    /**
     * The duration of the query execution.
     */
    executionTime?: number;
    /**
     * The raw results from the database if the query was successful.
     */
    rawResults?: any;
    /**
     * The error thrown if the query was unsuccessful.
     */
    error?: any;
}
