export * from "../shared/proto.js";
import { int32, uint32, Error, Stmt, StmtResult, Batch, BatchResult, CursorEntry, DescribeResult } from "../shared/proto.js";
export type ClientMsg = HelloMsg | RequestMsg;
export type ServerMsg = {
    type: "none";
} | HelloOkMsg | HelloErrorMsg | ResponseOkMsg | ResponseErrorMsg;
export type HelloMsg = {
    type: "hello";
    jwt: string | undefined;
};
export type HelloOkMsg = {
    type: "hello_ok";
};
export type HelloErrorMsg = {
    type: "hello_error";
    error: Error;
};
export type RequestMsg = {
    type: "request";
    requestId: int32;
    request: Request;
};
export type ResponseOkMsg = {
    type: "response_ok";
    requestId: int32;
    response: Response;
};
export type ResponseErrorMsg = {
    type: "response_error";
    requestId: int32;
    error: Error;
};
export type Request = OpenStreamReq | CloseStreamReq | ExecuteReq | BatchReq | OpenCursorReq | CloseCursorReq | FetchCursorReq | SequenceReq | DescribeReq | StoreSqlReq | CloseSqlReq | GetAutocommitReq;
export type Response = {
    type: "none";
} | OpenStreamResp | CloseStreamResp | ExecuteResp | BatchResp | OpenCursorResp | CloseCursorResp | FetchCursorResp | SequenceResp | DescribeResp | StoreSqlResp | CloseSqlResp | GetAutocommitResp;
export type OpenStreamReq = {
    type: "open_stream";
    streamId: int32;
};
export type OpenStreamResp = {
    type: "open_stream";
};
export type CloseStreamReq = {
    type: "close_stream";
    streamId: int32;
};
export type CloseStreamResp = {
    type: "close_stream";
};
export type ExecuteReq = {
    type: "execute";
    streamId: int32;
    stmt: Stmt;
};
export type ExecuteResp = {
    type: "execute";
    result: StmtResult;
};
export type BatchReq = {
    type: "batch";
    streamId: int32;
    batch: Batch;
};
export type BatchResp = {
    type: "batch";
    result: BatchResult;
};
export type OpenCursorReq = {
    type: "open_cursor";
    streamId: int32;
    cursorId: int32;
    batch: Batch;
};
export type OpenCursorResp = {
    type: "open_cursor";
};
export type CloseCursorReq = {
    type: "close_cursor";
    cursorId: int32;
};
export type CloseCursorResp = {
    type: "close_cursor";
};
export type FetchCursorReq = {
    type: "fetch_cursor";
    cursorId: int32;
    maxCount: uint32;
};
export type FetchCursorResp = {
    type: "fetch_cursor";
    entries: Array<CursorEntry>;
    done: boolean;
};
export type DescribeReq = {
    type: "describe";
    streamId: int32;
    sql: string | undefined;
    sqlId: int32 | undefined;
};
export type DescribeResp = {
    type: "describe";
    result: DescribeResult;
};
export type SequenceReq = {
    type: "sequence";
    streamId: int32;
    sql: string | undefined;
    sqlId: int32 | undefined;
};
export type SequenceResp = {
    type: "sequence";
};
export type StoreSqlReq = {
    type: "store_sql";
    sqlId: int32;
    sql: string;
};
export type StoreSqlResp = {
    type: "store_sql";
};
export type CloseSqlReq = {
    type: "close_sql";
    sqlId: int32;
};
export type CloseSqlResp = {
    type: "close_sql";
};
export type GetAutocommitReq = {
    type: "get_autocommit";
    streamId: int32;
};
export type GetAutocommitResp = {
    type: "get_autocommit";
    isAutocommit: boolean;
};
