import { TransactionCommitEvent } from "./event/TransactionCommitEvent";
import { TransactionRollbackEvent } from "./event/TransactionRollbackEvent";
import { TransactionStartEvent } from "./event/TransactionStartEvent";
import { UpdateEvent } from "./event/UpdateEvent";
import { RemoveEvent } from "./event/RemoveEvent";
import { InsertEvent } from "./event/InsertEvent";
import { LoadEvent } from "./event/LoadEvent";
import { SoftRemoveEvent } from "./event/SoftRemoveEvent";
import { RecoverEvent } from "./event/RecoverEvent";
import { AfterQueryEvent, BeforeQueryEvent } from "./event/QueryEvent";
/**
 * Classes that implement this interface are subscribers that subscribe for the specific events in the ORM.
 */
export interface EntitySubscriberInterface<Entity = any> {
    /**
     * Returns the class of the entity to which events will listen.
     * If this method is omitted, then subscriber will listen to events of all entities.
     */
    listenTo?(): Function | string;
    /**
     * Called after entity is loaded from the database.
     *
     * For backward compatibility this signature is slightly different from the
     * others.  `event` was added later but is always provided (it is only
     * optional in the signature so that its introduction does not break
     * compilation for existing subscribers).
     */
    afterLoad?(entity: Entity, event?: LoadEvent<Entity>): Promise<any> | void;
    /**
     * Called before query is executed.
     */
    beforeQuery?(event: BeforeQueryEvent<Entity>): Promise<any> | void;
    /**
     * Called after query is executed.
     */
    afterQuery?(event: AfterQueryEvent<Entity>): Promise<any> | void;
    /**
     * Called before entity is inserted to the database.
     */
    beforeInsert?(event: InsertEvent<Entity>): Promise<any> | void;
    /**
     * Called after entity is inserted to the database.
     */
    afterInsert?(event: InsertEvent<Entity>): Promise<any> | void;
    /**
     * Called before entity is updated in the database.
     */
    beforeUpdate?(event: UpdateEvent<Entity>): Promise<any> | void;
    /**
     * Called after entity is updated in the database.
     */
    afterUpdate?(event: UpdateEvent<Entity>): Promise<any> | void;
    /**
     * Called before entity is removed from the database.
     */
    beforeRemove?(event: RemoveEvent<Entity>): Promise<any> | void;
    /**
     * Called before entity is soft removed from the database.
     */
    beforeSoftRemove?(event: SoftRemoveEvent<Entity>): Promise<any> | void;
    /**
     * Called before entity is recovered in the database.
     */
    beforeRecover?(event: RecoverEvent<Entity>): Promise<any> | void;
    /**
     * Called after entity is removed from the database.
     */
    afterRemove?(event: RemoveEvent<Entity>): Promise<any> | void;
    /**
     * Called after entity is soft removed from the database.
     */
    afterSoftRemove?(event: SoftRemoveEvent<Entity>): Promise<any> | void;
    /**
     * Called after entity is recovered in the database.
     */
    afterRecover?(event: RecoverEvent<Entity>): Promise<any> | void;
    /**
     * Called before transaction is started.
     */
    beforeTransactionStart?(event: TransactionStartEvent): Promise<any> | void;
    /**
     * Called after transaction is started.
     */
    afterTransactionStart?(event: TransactionStartEvent): Promise<any> | void;
    /**
     * Called before transaction is committed.
     */
    beforeTransactionCommit?(event: TransactionCommitEvent): Promise<any> | void;
    /**
     * Called after transaction is committed.
     */
    afterTransactionCommit?(event: TransactionCommitEvent): Promise<any> | void;
    /**
     * Called before transaction rollback.
     */
    beforeTransactionRollback?(event: TransactionRollbackEvent): Promise<any> | void;
    /**
     * Called after transaction rollback.
     */
    afterTransactionRollback?(event: TransactionRollbackEvent): Promise<any> | void;
}
