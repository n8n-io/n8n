import { QueryRunner } from "../query-runner/QueryRunner";
import { Subject } from "./Subject";
import { SaveOptions } from "../repository/SaveOptions";
import { RemoveOptions } from "../repository/RemoveOptions";
import { BroadcasterResult } from "../subscriber/BroadcasterResult";
/**
 * Executes all database operations (inserts, updated, deletes) that must be executed
 * with given persistence subjects.
 */
export declare class SubjectExecutor {
    /**
     * Indicates if executor has any operations to execute (e.g. has insert / update / delete operations to be executed).
     */
    hasExecutableOperations: boolean;
    /**
     * QueryRunner used to execute all queries with a given subjects.
     */
    protected queryRunner: QueryRunner;
    /**
     * Persistence options.
     */
    protected options?: SaveOptions & RemoveOptions;
    /**
     * All subjects that needs to be operated.
     */
    protected allSubjects: Subject[];
    /**
     * Subjects that must be inserted.
     */
    protected insertSubjects: Subject[];
    /**
     * Subjects that must be updated.
     */
    protected updateSubjects: Subject[];
    /**
     * Subjects that must be removed.
     */
    protected removeSubjects: Subject[];
    /**
     * Subjects that must be soft-removed.
     */
    protected softRemoveSubjects: Subject[];
    /**
     * Subjects that must be recovered.
     */
    protected recoverSubjects: Subject[];
    constructor(queryRunner: QueryRunner, subjects: Subject[], options?: SaveOptions & RemoveOptions);
    /**
     * Executes all operations over given array of subjects.
     * Executes queries using given query runner.
     */
    execute(): Promise<void>;
    /**
     * Validates all given subjects.
     */
    protected validate(): void;
    /**
     * Performs entity re-computations - finds changed columns, re-builds insert/update/remove subjects.
     */
    protected recompute(): void;
    /**
     * Broadcasts "BEFORE_INSERT", "BEFORE_UPDATE", "BEFORE_REMOVE", "BEFORE_SOFT_REMOVE", "BEFORE_RECOVER" events for all given subjects.
     */
    protected broadcastBeforeEventsForAll(): BroadcasterResult;
    /**
     * Broadcasts "AFTER_INSERT", "AFTER_UPDATE", "AFTER_REMOVE", "AFTER_SOFT_REMOVE", "AFTER_RECOVER" events for all given subjects.
     * Returns void if there wasn't any listener or subscriber executed.
     * Note: this method has a performance-optimized code organization.
     */
    protected broadcastAfterEventsForAll(): BroadcasterResult;
    /**
     * Executes insert operations.
     */
    protected executeInsertOperations(): Promise<void>;
    /**
     * Updates all given subjects in the database.
     */
    protected executeUpdateOperations(): Promise<void>;
    /**
     * Removes all given subjects from the database.
     *
     * todo: we need to apply topological sort here as well
     */
    protected executeRemoveOperations(): Promise<void>;
    /**
     * Soft-removes all given subjects in the database.
     */
    protected executeSoftRemoveOperations(): Promise<void>;
    /**
     * Recovers all given subjects in the database.
     */
    protected executeRecoverOperations(): Promise<void>;
    /**
     * Updates all special columns of the saving entities (create date, update date, version, etc.).
     * Also updates nullable columns and columns with default values.
     */
    protected updateSpecialColumnsInPersistedEntities(): void;
    /**
     * Updates all special columns of the saving entities (create date, update date, version, etc.).
     * Also updates nullable columns and columns with default values.
     */
    protected updateSpecialColumnsInInsertedAndUpdatedEntities(subjects: Subject[]): void;
    /**
     * Groups subjects by metadata names (by tables) to make bulk insertions and deletions possible.
     * However there are some limitations with bulk insertions of data into tables with generated (increment) columns
     * in some drivers. Some drivers like mysql and sqlite does not support returning multiple generated columns
     * after insertion and can only return a single generated column value, that's why its not possible to do bulk insertion,
     * because it breaks insertion result's generatedMap and leads to problems when this subject is used in other subjects saves.
     * That's why we only support bulking in junction tables for those drivers.
     *
     * Other drivers like postgres and sql server support RETURNING / OUTPUT statement which allows to return generated
     * id for each inserted row, that's why bulk insertion is not limited to junction tables in there.
     */
    protected groupBulkSubjects(subjects: Subject[], type: "insert" | "delete"): [{
        [key: string]: Subject[];
    }, string[]];
}
