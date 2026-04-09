import { ProtoError, MisuseError } from "./errors.js";
import { stmtResultFromProto, rowsResultFromProto, rowResultFromProto, valueResultFromProto, errorFromProto, } from "./result.js";
import { stmtToProto } from "./stmt.js";
import { impossible } from "./util.js";
/** A builder for creating a batch and executing it on the server. */
export class Batch {
    /** @private */
    _stream;
    #useCursor;
    /** @private */
    _steps;
    #executed;
    /** @private */
    constructor(stream, useCursor) {
        this._stream = stream;
        this.#useCursor = useCursor;
        this._steps = [];
        this.#executed = false;
    }
    /** Return a builder for adding a step to the batch. */
    step() {
        return new BatchStep(this);
    }
    /** Execute the batch. */
    execute() {
        if (this.#executed) {
            throw new MisuseError("This batch has already been executed");
        }
        this.#executed = true;
        const batch = {
            steps: this._steps.map((step) => step.proto),
        };
        if (this.#useCursor) {
            return executeCursor(this._stream, this._steps, batch);
        }
        else {
            return executeRegular(this._stream, this._steps, batch);
        }
    }
}
function executeRegular(stream, steps, batch) {
    return stream._batch(batch).then((result) => {
        for (let step = 0; step < steps.length; ++step) {
            const stepResult = result.stepResults.get(step);
            const stepError = result.stepErrors.get(step);
            steps[step].callback(stepResult, stepError);
        }
    });
}
async function executeCursor(stream, steps, batch) {
    const cursor = await stream._openCursor(batch);
    try {
        let nextStep = 0;
        let beginEntry = undefined;
        let rows = [];
        for (;;) {
            const entry = await cursor.next();
            if (entry === undefined) {
                break;
            }
            if (entry.type === "step_begin") {
                if (entry.step < nextStep || entry.step >= steps.length) {
                    throw new ProtoError("Server produced StepBeginEntry for unexpected step");
                }
                else if (beginEntry !== undefined) {
                    throw new ProtoError("Server produced StepBeginEntry before terminating previous step");
                }
                for (let step = nextStep; step < entry.step; ++step) {
                    steps[step].callback(undefined, undefined);
                }
                nextStep = entry.step + 1;
                beginEntry = entry;
                rows = [];
            }
            else if (entry.type === "step_end") {
                if (beginEntry === undefined) {
                    throw new ProtoError("Server produced StepEndEntry but no step is active");
                }
                const stmtResult = {
                    cols: beginEntry.cols,
                    rows,
                    affectedRowCount: entry.affectedRowCount,
                    lastInsertRowid: entry.lastInsertRowid,
                };
                steps[beginEntry.step].callback(stmtResult, undefined);
                beginEntry = undefined;
                rows = [];
            }
            else if (entry.type === "step_error") {
                if (beginEntry === undefined) {
                    if (entry.step >= steps.length) {
                        throw new ProtoError("Server produced StepErrorEntry for unexpected step");
                    }
                    for (let step = nextStep; step < entry.step; ++step) {
                        steps[step].callback(undefined, undefined);
                    }
                }
                else {
                    if (entry.step !== beginEntry.step) {
                        throw new ProtoError("Server produced StepErrorEntry for unexpected step");
                    }
                    beginEntry = undefined;
                    rows = [];
                }
                steps[entry.step].callback(undefined, entry.error);
                nextStep = entry.step + 1;
            }
            else if (entry.type === "row") {
                if (beginEntry === undefined) {
                    throw new ProtoError("Server produced RowEntry but no step is active");
                }
                rows.push(entry.row);
            }
            else if (entry.type === "error") {
                throw errorFromProto(entry.error);
            }
            else if (entry.type === "none") {
                throw new ProtoError("Server produced unrecognized CursorEntry");
            }
            else {
                throw impossible(entry, "Impossible CursorEntry");
            }
        }
        if (beginEntry !== undefined) {
            throw new ProtoError("Server closed Cursor before terminating active step");
        }
        for (let step = nextStep; step < steps.length; ++step) {
            steps[step].callback(undefined, undefined);
        }
    }
    finally {
        cursor.close();
    }
}
/** A builder for adding a step to the batch. */
export class BatchStep {
    /** @private */
    _batch;
    #conds;
    /** @private */
    _index;
    /** @private */
    constructor(batch) {
        this._batch = batch;
        this.#conds = [];
        this._index = undefined;
    }
    /** Add the condition that needs to be satisfied to execute the statement. If you use this method multiple
     * times, we join the conditions with a logical AND. */
    condition(cond) {
        this.#conds.push(cond._proto);
        return this;
    }
    /** Add a statement that returns rows. */
    query(stmt) {
        return this.#add(stmt, true, rowsResultFromProto);
    }
    /** Add a statement that returns at most a single row. */
    queryRow(stmt) {
        return this.#add(stmt, true, rowResultFromProto);
    }
    /** Add a statement that returns at most a single value. */
    queryValue(stmt) {
        return this.#add(stmt, true, valueResultFromProto);
    }
    /** Add a statement without returning rows. */
    run(stmt) {
        return this.#add(stmt, false, stmtResultFromProto);
    }
    #add(inStmt, wantRows, fromProto) {
        if (this._index !== undefined) {
            throw new MisuseError("This BatchStep has already been added to the batch");
        }
        const stmt = stmtToProto(this._batch._stream._sqlOwner(), inStmt, wantRows);
        let condition;
        if (this.#conds.length === 0) {
            condition = undefined;
        }
        else if (this.#conds.length === 1) {
            condition = this.#conds[0];
        }
        else {
            condition = { type: "and", conds: this.#conds.slice() };
        }
        const proto = { stmt, condition };
        return new Promise((outputCallback, errorCallback) => {
            const callback = (stepResult, stepError) => {
                if (stepResult !== undefined && stepError !== undefined) {
                    errorCallback(new ProtoError("Server returned both result and error"));
                }
                else if (stepError !== undefined) {
                    errorCallback(errorFromProto(stepError));
                }
                else if (stepResult !== undefined) {
                    outputCallback(fromProto(stepResult, this._batch._stream.intMode));
                }
                else {
                    outputCallback(undefined);
                }
            };
            this._index = this._batch._steps.length;
            this._batch._steps.push({ proto, callback });
        });
    }
}
export class BatchCond {
    /** @private */
    _batch;
    /** @private */
    _proto;
    /** @private */
    constructor(batch, proto) {
        this._batch = batch;
        this._proto = proto;
    }
    /** Create a condition that evaluates to true when the given step executes successfully.
     *
     * If the given step fails error or is skipped because its condition evaluated to false, this
     * condition evaluates to false.
     */
    static ok(step) {
        return new BatchCond(step._batch, { type: "ok", step: stepIndex(step) });
    }
    /** Create a condition that evaluates to true when the given step fails.
     *
     * If the given step succeeds or is skipped because its condition evaluated to false, this condition
     * evaluates to false.
     */
    static error(step) {
        return new BatchCond(step._batch, { type: "error", step: stepIndex(step) });
    }
    /** Create a condition that is a logical negation of another condition.
     */
    static not(cond) {
        return new BatchCond(cond._batch, { type: "not", cond: cond._proto });
    }
    /** Create a condition that is a logical AND of other conditions.
     */
    static and(batch, conds) {
        for (const cond of conds) {
            checkCondBatch(batch, cond);
        }
        return new BatchCond(batch, { type: "and", conds: conds.map(e => e._proto) });
    }
    /** Create a condition that is a logical OR of other conditions.
     */
    static or(batch, conds) {
        for (const cond of conds) {
            checkCondBatch(batch, cond);
        }
        return new BatchCond(batch, { type: "or", conds: conds.map(e => e._proto) });
    }
    /** Create a condition that evaluates to true when the SQL connection is in autocommit mode (not inside an
     * explicit transaction). This requires protocol version 3 or higher.
     */
    static isAutocommit(batch) {
        batch._stream.client()._ensureVersion(3, "BatchCond.isAutocommit()");
        return new BatchCond(batch, { type: "is_autocommit" });
    }
}
function stepIndex(step) {
    if (step._index === undefined) {
        throw new MisuseError("Cannot add a condition referencing a step that has not been added to the batch");
    }
    return step._index;
}
function checkCondBatch(expectedBatch, cond) {
    if (cond._batch !== expectedBatch) {
        throw new MisuseError("Cannot mix BatchCond objects for different Batch objects");
    }
}
