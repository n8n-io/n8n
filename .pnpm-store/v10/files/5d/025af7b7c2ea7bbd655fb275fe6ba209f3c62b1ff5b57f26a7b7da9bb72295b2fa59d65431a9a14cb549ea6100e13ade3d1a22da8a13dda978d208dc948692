import { Subject } from "../Subject";
import { QueryRunner } from "../../query-runner/QueryRunner";
/**
 * Executes subject operations for closure entities.
 */
export declare class ClosureSubjectExecutor {
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
     * Gets escaped table name with schema name if SqlServer or Postgres driver used with custom
     * schema name, otherwise returns escaped table name.
     */
    protected getTableName(tablePath: string): string;
}
