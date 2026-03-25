import { EntitySubscriberInterface } from "./EntitySubscriberInterface";
import { ObjectLiteral } from "../common/ObjectLiteral";
import { QueryRunner } from "../query-runner/QueryRunner";
import { EntityMetadata } from "../metadata/EntityMetadata";
import { BroadcasterResult } from "./BroadcasterResult";
import { ColumnMetadata } from "../metadata/ColumnMetadata";
import { RelationMetadata } from "../metadata/RelationMetadata";
interface BroadcasterEvents {
    BeforeQuery: () => void;
    AfterQuery: () => void;
    BeforeTransactionCommit: () => void;
    AfterTransactionCommit: () => void;
    BeforeTransactionStart: () => void;
    AfterTransactionStart: () => void;
    BeforeTransactionRollback: () => void;
    AfterTransactionRollback: () => void;
    BeforeUpdate: (metadata: EntityMetadata, entity?: ObjectLiteral, databaseEntity?: ObjectLiteral, updatedColumns?: ColumnMetadata[], updatedRelations?: RelationMetadata[]) => void;
    AfterUpdate: (metadata: EntityMetadata, entity?: ObjectLiteral, databaseEntity?: ObjectLiteral, updatedColumns?: ColumnMetadata[], updatedRelations?: RelationMetadata[]) => void;
    BeforeInsert: (metadata: EntityMetadata, entity: ObjectLiteral | undefined) => void;
    AfterInsert: (metadata: EntityMetadata, entity: ObjectLiteral | undefined) => void;
    BeforeRemove: (metadata: EntityMetadata, entity?: ObjectLiteral, databaseEntity?: ObjectLiteral) => void;
    AfterRemove: (metadata: EntityMetadata, entity?: ObjectLiteral, databaseEntity?: ObjectLiteral) => void;
    BeforeSoftRemove: (metadata: EntityMetadata, entity?: ObjectLiteral, databaseEntity?: ObjectLiteral) => void;
    AfterSoftRemove: (metadata: EntityMetadata, entity?: ObjectLiteral, databaseEntity?: ObjectLiteral) => void;
    BeforeRecover: (metadata: EntityMetadata, entity?: ObjectLiteral, databaseEntity?: ObjectLiteral) => void;
    AfterRecover: (metadata: EntityMetadata, entity?: ObjectLiteral, databaseEntity?: ObjectLiteral) => void;
    Load: (metadata: EntityMetadata, entities: ObjectLiteral[]) => void;
}
/**
 * Broadcaster provides a helper methods to broadcast events to the subscribers.
 */
export declare class Broadcaster {
    private queryRunner;
    constructor(queryRunner: QueryRunner);
    broadcast<U extends keyof BroadcasterEvents>(event: U, ...args: Parameters<BroadcasterEvents[U]>): Promise<void>;
    /**
     * Broadcasts "BEFORE_INSERT" event.
     * Before insert event is executed before entity is being inserted to the database for the first time.
     * All subscribers and entity listeners who listened to this event will be executed at this point.
     * Subscribers and entity listeners can return promises, it will wait until they are resolved.
     *
     * Note: this method has a performance-optimized code organization, do not change code structure.
     */
    broadcastBeforeInsertEvent(result: BroadcasterResult, metadata: EntityMetadata, entity: undefined | ObjectLiteral): void;
    /**
     * Broadcasts "BEFORE_UPDATE" event.
     * Before update event is executed before entity is being updated in the database.
     * All subscribers and entity listeners who listened to this event will be executed at this point.
     * Subscribers and entity listeners can return promises, it will wait until they are resolved.
     *
     * Note: this method has a performance-optimized code organization, do not change code structure.
     */
    broadcastBeforeUpdateEvent(result: BroadcasterResult, metadata: EntityMetadata, entity?: ObjectLiteral, databaseEntity?: ObjectLiteral, updatedColumns?: ColumnMetadata[], updatedRelations?: RelationMetadata[]): void;
    /**
     * Broadcasts "BEFORE_REMOVE" event.
     * Before remove event is executed before entity is being removed from the database.
     * All subscribers and entity listeners who listened to this event will be executed at this point.
     * Subscribers and entity listeners can return promises, it will wait until they are resolved.
     *
     * Note: this method has a performance-optimized code organization, do not change code structure.
     */
    broadcastBeforeRemoveEvent(result: BroadcasterResult, metadata: EntityMetadata, entity?: ObjectLiteral, databaseEntity?: ObjectLiteral, identifier?: ObjectLiteral): void;
    /**
     * Broadcasts "BEFORE_SOFT_REMOVE" event.
     * Before soft remove event is executed before entity is being soft removed from the database.
     * All subscribers and entity listeners who listened to this event will be executed at this point.
     * Subscribers and entity listeners can return promises, it will wait until they are resolved.
     *
     * Note: this method has a performance-optimized code organization, do not change code structure.
     */
    broadcastBeforeSoftRemoveEvent(result: BroadcasterResult, metadata: EntityMetadata, entity?: ObjectLiteral, databaseEntity?: ObjectLiteral, identifier?: ObjectLiteral): void;
    /**
     * Broadcasts "BEFORE_RECOVER" event.
     * Before recover event is executed before entity is being recovered in the database.
     * All subscribers and entity listeners who listened to this event will be executed at this point.
     * Subscribers and entity listeners can return promises, it will wait until they are resolved.
     *
     * Note: this method has a performance-optimized code organization, do not change code structure.
     */
    broadcastBeforeRecoverEvent(result: BroadcasterResult, metadata: EntityMetadata, entity?: ObjectLiteral, databaseEntity?: ObjectLiteral, identifier?: ObjectLiteral): void;
    /**
     * Broadcasts "AFTER_INSERT" event.
     * After insert event is executed after entity is being persisted to the database for the first time.
     * All subscribers and entity listeners who listened to this event will be executed at this point.
     * Subscribers and entity listeners can return promises, it will wait until they are resolved.
     *
     * Note: this method has a performance-optimized code organization, do not change code structure.
     */
    broadcastAfterInsertEvent(result: BroadcasterResult, metadata: EntityMetadata, entity?: ObjectLiteral, identifier?: ObjectLiteral): void;
    /**
     * Broadcasts "BEFORE_QUERY" event.
     */
    broadcastBeforeQueryEvent(result: BroadcasterResult, query: string, parameters: undefined | any[]): void;
    /**
     * Broadcasts "AFTER_QUERY" event.
     */
    broadcastAfterQueryEvent(result: BroadcasterResult, query: string, parameters: undefined | any[], success: boolean, executionTime: undefined | number, rawResults: undefined | any, error: undefined | any): void;
    /**
     * Broadcasts "BEFORE_TRANSACTION_START" event.
     */
    broadcastBeforeTransactionStartEvent(result: BroadcasterResult): void;
    /**
     * Broadcasts "AFTER_TRANSACTION_START" event.
     */
    broadcastAfterTransactionStartEvent(result: BroadcasterResult): void;
    /**
     * Broadcasts "BEFORE_TRANSACTION_COMMIT" event.
     */
    broadcastBeforeTransactionCommitEvent(result: BroadcasterResult): void;
    /**
     * Broadcasts "AFTER_TRANSACTION_COMMIT" event.
     */
    broadcastAfterTransactionCommitEvent(result: BroadcasterResult): void;
    /**
     * Broadcasts "BEFORE_TRANSACTION_ROLLBACK" event.
     */
    broadcastBeforeTransactionRollbackEvent(result: BroadcasterResult): void;
    /**
     * Broadcasts "AFTER_TRANSACTION_ROLLBACK" event.
     */
    broadcastAfterTransactionRollbackEvent(result: BroadcasterResult): void;
    /**
     * Broadcasts "AFTER_UPDATE" event.
     * After update event is executed after entity is being updated in the database.
     * All subscribers and entity listeners who listened to this event will be executed at this point.
     * Subscribers and entity listeners can return promises, it will wait until they are resolved.
     *
     * Note: this method has a performance-optimized code organization, do not change code structure.
     */
    broadcastAfterUpdateEvent(result: BroadcasterResult, metadata: EntityMetadata, entity?: ObjectLiteral, databaseEntity?: ObjectLiteral, updatedColumns?: ColumnMetadata[], updatedRelations?: RelationMetadata[]): void;
    /**
     * Broadcasts "AFTER_REMOVE" event.
     * After remove event is executed after entity is being removed from the database.
     * All subscribers and entity listeners who listened to this event will be executed at this point.
     * Subscribers and entity listeners can return promises, it will wait until they are resolved.
     *
     * Note: this method has a performance-optimized code organization, do not change code structure.
     */
    broadcastAfterRemoveEvent(result: BroadcasterResult, metadata: EntityMetadata, entity?: ObjectLiteral, databaseEntity?: ObjectLiteral, identifier?: ObjectLiteral): void;
    /**
     * Broadcasts "AFTER_SOFT_REMOVE" event.
     * After soft remove event is executed after entity is being soft removed from the database.
     * All subscribers and entity listeners who listened to this event will be executed at this point.
     * Subscribers and entity listeners can return promises, it will wait until they are resolved.
     *
     * Note: this method has a performance-optimized code organization, do not change code structure.
     */
    broadcastAfterSoftRemoveEvent(result: BroadcasterResult, metadata: EntityMetadata, entity?: ObjectLiteral, databaseEntity?: ObjectLiteral, identifier?: ObjectLiteral): void;
    /**
     * Broadcasts "AFTER_RECOVER" event.
     * After recover event is executed after entity is being recovered in the database.
     * All subscribers and entity listeners who listened to this event will be executed at this point.
     * Subscribers and entity listeners can return promises, it will wait until they are resolved.
     *
     * Note: this method has a performance-optimized code organization, do not change code structure.
     */
    broadcastAfterRecoverEvent(result: BroadcasterResult, metadata: EntityMetadata, entity?: ObjectLiteral, databaseEntity?: ObjectLiteral, identifier?: ObjectLiteral): void;
    /**
     * @deprecated Use `broadcastLoadForAllEvent`
     */
    broadcastLoadEventsForAll(result: BroadcasterResult, metadata: EntityMetadata, entities: ObjectLiteral[]): void;
    /**
     * Broadcasts "AFTER_LOAD" event for all given entities, and their sub-entities.
     * After load event is executed after entity has been loaded from the database.
     * All subscribers and entity listeners who listened to this event will be executed at this point.
     * Subscribers and entity listeners can return promises, it will wait until they are resolved.
     *
     * Note: this method has a performance-optimized code organization, do not change code structure.
     */
    broadcastLoadEvent(result: BroadcasterResult, metadata: EntityMetadata, entities: ObjectLiteral[]): void;
    /**
     * Checks if subscriber's methods can be executed by checking if its don't listen to the particular entity,
     * or listens our entity.
     */
    protected isAllowedSubscriber(subscriber: EntitySubscriberInterface<any>, target: Function | string): boolean;
}
export {};
