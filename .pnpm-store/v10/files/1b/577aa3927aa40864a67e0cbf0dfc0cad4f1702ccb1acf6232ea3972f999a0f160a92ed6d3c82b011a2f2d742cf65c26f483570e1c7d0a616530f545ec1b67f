import { EntityManager } from "../../entity-manager/EntityManager";
import { DataSource } from "../../data-source/DataSource";
import { QueryRunner } from "../../query-runner/QueryRunner";
import { EntityMetadata } from "../../metadata/EntityMetadata";
import { ObjectLiteral } from "../../common/ObjectLiteral";
/**
 * InsertEvent is an object that broadcaster sends to the entity subscriber when entity is inserted to the database.
 */
export interface InsertEvent<Entity> {
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
     * Inserting event.
     */
    entity: Entity;
    /**
     * Id or ids of the entity being inserted.
     */
    entityId?: ObjectLiteral;
    /**
     * Metadata of the entity.
     */
    metadata: EntityMetadata;
}
