export type int32 = number;
export type uint32 = number;
export type Error = {
    message: string;
    code: string | undefined;
};
export type Stmt = {
    sql: string | undefined;
    sqlId: int32 | undefined;
    args: Array<Value>;
    namedArgs: Array<NamedArg>;
    wantRows: boolean;
};
export type NamedArg = {
    name: string;
    value: Value;
};
export type StmtResult = {
    cols: Array<Col>;
    rows: Array<Array<Value>>;
    affectedRowCount: number;
    lastInsertRowid: bigint | undefined;
};
export type Col = {
    name: string | undefined;
    decltype: string | undefined;
};
export type Batch = {
    steps: Array<BatchStep>;
};
export type BatchStep = {
    condition: BatchCond | undefined;
    stmt: Stmt;
};
export type BatchCond = {
    type: "ok";
    step: uint32;
} | {
    type: "error";
    step: uint32;
} | {
    type: "not";
    cond: BatchCond;
} | {
    type: "and";
    conds: Array<BatchCond>;
} | {
    type: "or";
    conds: Array<BatchCond>;
} | {
    type: "is_autocommit";
};
export type BatchResult = {
    stepResults: Map<uint32, StmtResult>;
    stepErrors: Map<uint32, Error>;
};
export type CursorEntry = {
    type: "none";
} | StepBeginEntry | StepEndEntry | StepErrorEntry | RowEntry | ErrorEntry;
export type StepBeginEntry = {
    type: "step_begin";
    step: uint32;
    cols: Array<Col>;
};
export type StepEndEntry = {
    type: "step_end";
    affectedRowCount: number;
    lastInsertRowid: bigint | undefined;
};
export type StepErrorEntry = {
    type: "step_error";
    step: uint32;
    error: Error;
};
export type RowEntry = {
    type: "row";
    row: Array<Value>;
};
export type ErrorEntry = {
    type: "error";
    error: Error;
};
export type DescribeResult = {
    params: Array<DescribeParam>;
    cols: Array<DescribeCol>;
    isExplain: boolean;
    isReadonly: boolean;
};
export type DescribeParam = {
    name: string | undefined;
};
export type DescribeCol = {
    name: string;
    decltype: string | undefined;
};
export type Value = undefined | null | bigint | number | string | Uint8Array;
