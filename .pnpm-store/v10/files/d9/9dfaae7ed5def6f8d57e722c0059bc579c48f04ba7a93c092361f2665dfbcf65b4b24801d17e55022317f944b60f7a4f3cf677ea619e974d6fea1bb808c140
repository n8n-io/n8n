export * from "../shared/proto.js";
import { int32, Error, Stmt, StmtResult, Batch, BatchResult, DescribeResult } from "../shared/proto.js";
export type PipelineReqBody = {
    baton: string | undefined;
    requests: Array<StreamRequest>;
};
export type PipelineRespBody = {
    baton: string | undefined;
    baseUrl: string | undefined;
    results: Array<StreamResult>;
};
export type StreamResult = {
    type: "none";
} | StreamResultOk | StreamResultError;
export type StreamResultOk = {
    type: "ok";
    response: StreamResponse;
};
export type StreamResultError = {
    type: "error";
    error: Error;
};
export type CursorReqBody = {
    baton: string | undefined;
    batch: Batch;
};
export type CursorRespBody = {
    baton: string | undefined;
    baseUrl: string | undefined;
};
export type StreamRequest = CloseStreamReq | ExecuteStreamReq | BatchStreamReq | SequenceStreamReq | DescribeStreamReq | StoreSqlStreamReq | CloseSqlStreamReq | GetAutocommitStreamReq;
export type StreamResponse = {
    type: "none";
} | CloseStreamResp | ExecuteStreamResp | BatchStreamResp | SequenceStreamResp | DescribeStreamResp | StoreSqlStreamResp | CloseSqlStreamResp | GetAutocommitStreamResp;
export type CloseStreamReq = {
    type: "close";
};
export type CloseStreamResp = {
    type: "close";
};
export type ExecuteStreamReq = {
    type: "execute";
    stmt: Stmt;
};
export type ExecuteStreamResp = {
    type: "execute";
    result: StmtResult;
};
export type BatchStreamReq = {
    type: "batch";
    batch: Batch;
};
export type BatchStreamResp = {
    type: "batch";
    result: BatchResult;
};
export type SequenceStreamReq = {
    type: "sequence";
    sql: string | undefined;
    sqlId: int32 | undefined;
};
export type SequenceStreamResp = {
    type: "sequence";
};
export type DescribeStreamReq = {
    type: "describe";
    sql: string | undefined;
    sqlId: int32 | undefined;
};
export type DescribeStreamResp = {
    type: "describe";
    result: DescribeResult;
};
export type StoreSqlStreamReq = {
    type: "store_sql";
    sqlId: int32;
    sql: string;
};
export type StoreSqlStreamResp = {
    type: "store_sql";
};
export type CloseSqlStreamReq = {
    type: "close_sql";
    sqlId: int32;
};
export type CloseSqlStreamResp = {
    type: "close_sql";
};
export type GetAutocommitStreamReq = {
    type: "get_autocommit";
};
export type GetAutocommitStreamResp = {
    type: "get_autocommit";
    isAutocommit: boolean;
};
