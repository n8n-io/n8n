import type { RowsResult, RowResult, ValueResult, StmtResult } from "./result.js";
import type * as proto from "./shared/proto.js";
import type { InStmt } from "./stmt.js";
import { Stream } from "./stream.js";
/** A builder for creating a batch and executing it on the server. */
export declare class Batch {
    #private;
    /** @private */
    _stream: Stream;
    /** @private */
    _steps: Array<BatchStepState>;
    /** @private */
    constructor(stream: Stream, useCursor: boolean);
    /** Return a builder for adding a step to the batch. */
    step(): BatchStep;
    /** Execute the batch. */
    execute(): Promise<void>;
}
interface BatchStepState {
    proto: proto.BatchStep;
    callback(stepResult: proto.StmtResult | undefined, stepError: proto.Error | undefined): void;
}
/** A builder for adding a step to the batch. */
export declare class BatchStep {
    #private;
    /** @private */
    _batch: Batch;
    /** @private */
    _index: number | undefined;
    /** @private */
    constructor(batch: Batch);
    /** Add the condition that needs to be satisfied to execute the statement. If you use this method multiple
     * times, we join the conditions with a logical AND. */
    condition(cond: BatchCond): this;
    /** Add a statement that returns rows. */
    query(stmt: InStmt): Promise<RowsResult | undefined>;
    /** Add a statement that returns at most a single row. */
    queryRow(stmt: InStmt): Promise<RowResult | undefined>;
    /** Add a statement that returns at most a single value. */
    queryValue(stmt: InStmt): Promise<ValueResult | undefined>;
    /** Add a statement without returning rows. */
    run(stmt: InStmt): Promise<StmtResult | undefined>;
}
export declare class BatchCond {
    /** @private */
    _batch: Batch;
    /** @private */
    _proto: proto.BatchCond;
    /** @private */
    constructor(batch: Batch, proto: proto.BatchCond);
    /** Create a condition that evaluates to true when the given step executes successfully.
     *
     * If the given step fails error or is skipped because its condition evaluated to false, this
     * condition evaluates to false.
     */
    static ok(step: BatchStep): BatchCond;
    /** Create a condition that evaluates to true when the given step fails.
     *
     * If the given step succeeds or is skipped because its condition evaluated to false, this condition
     * evaluates to false.
     */
    static error(step: BatchStep): BatchCond;
    /** Create a condition that is a logical negation of another condition.
     */
    static not(cond: BatchCond): BatchCond;
    /** Create a condition that is a logical AND of other conditions.
     */
    static and(batch: Batch, conds: Array<BatchCond>): BatchCond;
    /** Create a condition that is a logical OR of other conditions.
     */
    static or(batch: Batch, conds: Array<BatchCond>): BatchCond;
    /** Create a condition that evaluates to true when the SQL connection is in autocommit mode (not inside an
     * explicit transaction). This requires protocol version 3 or higher.
     */
    static isAutocommit(batch: Batch): BatchCond;
}
export {};
