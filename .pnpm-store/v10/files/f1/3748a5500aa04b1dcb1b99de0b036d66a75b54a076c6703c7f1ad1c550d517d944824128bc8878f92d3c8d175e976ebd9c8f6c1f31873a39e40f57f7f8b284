import { Subject } from "./Subject";
/**
 * Finds what columns are changed in the subject entities.
 */
export declare class SubjectChangedColumnsComputer {
    /**
     * Finds what columns are changed in the subject entities.
     */
    compute(subjects: Subject[]): void;
    /**
     * Differentiate columns from the updated entity and entity stored in the database.
     */
    protected computeDiffColumns(subject: Subject): void;
    /**
     * Difference columns of the owning one-to-one and many-to-one columns.
     */
    protected computeDiffRelationalColumns(allSubjects: Subject[], subject: Subject): void;
}
