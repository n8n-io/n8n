import { Subject } from "../Subject";
import { QueryRunner } from "../../query-runner/QueryRunner";
import { ObjectLiteral } from "../../common/ObjectLiteral";
import { EntityMetadata } from "../../metadata/EntityMetadata";
declare class NestedSetIds {
    left: number;
    right: number;
}
/**
 * Executes subject operations for nested set tree entities.
 */
export declare class NestedSetSubjectExecutor {
    protected queryRunner: QueryRunner;
    constructor(queryRunner: QueryRunner);
    /**
     * Executes operations when subject is being inserted.
     */
    insert(subject: Subject): Promise<void>;
    /**
     * Executes operations when subject is being updated.
     */
    update(subject: Subject): Promise<void>;
    /**
     * Executes operations when subject is being removed.
     */
    remove(subjects: Subject | Subject[]): Promise<void>;
    /**
     * Get the nested set ids for a given entity
     */
    protected getNestedSetIds(metadata: EntityMetadata, ids: ObjectLiteral | ObjectLiteral[]): Promise<NestedSetIds[]>;
    private isUniqueRootEntity;
    /**
     * Gets escaped table name with schema name if SqlServer or Postgres driver used with custom
     * schema name, otherwise returns escaped table name.
     */
    protected getTableName(tablePath: string): string;
}
export {};
