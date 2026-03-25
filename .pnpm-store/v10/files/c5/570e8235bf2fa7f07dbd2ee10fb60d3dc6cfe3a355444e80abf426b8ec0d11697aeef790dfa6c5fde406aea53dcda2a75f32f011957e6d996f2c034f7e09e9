import { Subject } from "./Subject";
import { ObjectLiteral } from "../common/ObjectLiteral";
import { QueryRunner } from "../query-runner/QueryRunner";
/**
 * Loads database entities for all operate subjects which do not have database entity set.
 * All entities that we load database entities for are marked as updated or inserted.
 * To understand which of them really needs to be inserted or updated we need to load
 * their original representations from the database.
 */
export declare class SubjectDatabaseEntityLoader {
    protected queryRunner: QueryRunner;
    protected subjects: Subject[];
    constructor(queryRunner: QueryRunner, subjects: Subject[]);
    /**
     * Loads database entities for all subjects.
     *
     * loadAllRelations flag is used to load all relation ids of the object, no matter if they present in subject entity or not.
     * This option is used for deletion.
     */
    load(operationType: "save" | "remove" | "soft-remove" | "recover"): Promise<void>;
    /**
     * Finds subjects where entity like given subject's entity.
     * Comparison made by entity id.
     * Multiple subjects may be returned if duplicates are present in the subject array.
     * This will likely result in the same row being updated multiple times during a transaction.
     */
    protected findByPersistEntityLike(entityTarget: Function | string, entity: ObjectLiteral): Subject[];
    /**
     * Groups given Subject objects into groups separated by entity targets.
     */
    protected groupByEntityTargets(): {
        target: Function | string;
        subjects: Subject[];
    }[];
}
