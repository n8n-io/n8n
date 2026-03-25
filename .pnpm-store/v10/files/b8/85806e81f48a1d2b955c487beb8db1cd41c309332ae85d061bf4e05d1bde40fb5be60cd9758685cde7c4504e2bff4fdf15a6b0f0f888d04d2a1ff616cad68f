import { EntityManager } from "../../entity-manager/EntityManager";
import { DataSource } from "../../data-source/DataSource";
import { QueryRunner } from "../../query-runner/QueryRunner";
import { EntityMetadata } from "../../metadata/EntityMetadata";
/**
 * RemoveEvent is an object that broadcaster sends to the entity subscriber when entity is being removed to the database.
 */
export interface RemoveEvent<Entity> {
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
     * Entity that is being removed.
     * This may absent if entity is removed without being loaded (for examples by cascades).
     */
    entity?: Entity;
    /**
     * Metadata of the entity.
     */
    metadata: EntityMetadata;
    /**
     * Database representation of entity that is being removed.
     */
    databaseEntity: Entity;
    /**
     * Id or ids of the entity that is being removed.
     */
    entityId?: any;
}
