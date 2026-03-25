/// <reference types="node" />
export declare type Mode = 'text' | 'binary';
export declare type MessageName = 'parseComplete' | 'bindComplete' | 'closeComplete' | 'noData' | 'portalSuspended' | 'replicationStart' | 'emptyQuery' | 'copyDone' | 'copyData' | 'rowDescription' | 'parameterDescription' | 'parameterStatus' | 'backendKeyData' | 'notification' | 'readyForQuery' | 'commandComplete' | 'dataRow' | 'copyInResponse' | 'copyOutResponse' | 'authenticationOk' | 'authenticationMD5Password' | 'authenticationCleartextPassword' | 'authenticationSASL' | 'authenticationSASLContinue' | 'authenticationSASLFinal' | 'error' | 'notice';
export interface BackendMessage {
    name: MessageName;
    length: number;
}
export declare const parseComplete: BackendMessage;
export declare const bindComplete: BackendMessage;
export declare const closeComplete: BackendMessage;
export declare const noData: BackendMessage;
export declare const portalSuspended: BackendMessage;
export declare const replicationStart: BackendMessage;
export declare const emptyQuery: BackendMessage;
export declare const copyDone: BackendMessage;
interface NoticeOrError {
    message: string | undefined;
    severity: string | undefined;
    code: string | undefined;
    detail: string | undefined;
    hint: string | undefined;
    position: string | undefined;
    internalPosition: string | undefined;
    internalQuery: string | undefined;
    where: string | undefined;
    schema: string | undefined;
    table: string | undefined;
    column: string | undefined;
    dataType: string | undefined;
    constraint: string | undefined;
    file: string | undefined;
    line: string | undefined;
    routine: string | undefined;
}
export declare class DatabaseError extends Error implements NoticeOrError {
    readonly length: number;
    readonly name: MessageName;
    severity: string | undefined;
    code: string | undefined;
    detail: string | undefined;
    hint: string | undefined;
    position: string | undefined;
    internalPosition: string | undefined;
    internalQuery: string | undefined;
    where: string | undefined;
    schema: string | undefined;
    table: string | undefined;
    column: string | undefined;
    dataType: string | undefined;
    constraint: string | undefined;
    file: string | undefined;
    line: string | undefined;
    routine: string | undefined;
    constructor(message: string, length: number, name: MessageName);
}
export declare class CopyDataMessage {
    readonly length: number;
    readonly chunk: Buffer;
    readonly name = "copyData";
    constructor(length: number, chunk: Buffer);
}
export declare class CopyResponse {
    readonly length: number;
    readonly name: MessageName;
    readonly binary: boolean;
    readonly columnTypes: number[];
    constructor(length: number, name: MessageName, binary: boolean, columnCount: number);
}
export declare class Field {
    readonly name: string;
    readonly tableID: number;
    readonly columnID: number;
    readonly dataTypeID: number;
    readonly dataTypeSize: number;
    readonly dataTypeModifier: number;
    readonly format: Mode;
    constructor(name: string, tableID: number, columnID: number, dataTypeID: number, dataTypeSize: number, dataTypeModifier: number, format: Mode);
}
export declare class RowDescriptionMessage {
    readonly length: number;
    readonly fieldCount: number;
    readonly name: MessageName;
    readonly fields: Field[];
    constructor(length: number, fieldCount: number);
}
export declare class ParameterDescriptionMessage {
    readonly length: number;
    readonly parameterCount: number;
    readonly name: MessageName;
    readonly dataTypeIDs: number[];
    constructor(length: number, parameterCount: number);
}
export declare class ParameterStatusMessage {
    readonly length: number;
    readonly parameterName: string;
    readonly parameterValue: string;
    readonly name: MessageName;
    constructor(length: number, parameterName: string, parameterValue: string);
}
export declare class AuthenticationMD5Password implements BackendMessage {
    readonly length: number;
    readonly salt: Buffer;
    readonly name: MessageName;
    constructor(length: number, salt: Buffer);
}
export declare class BackendKeyDataMessage {
    readonly length: number;
    readonly processID: number;
    readonly secretKey: number;
    readonly name: MessageName;
    constructor(length: number, processID: number, secretKey: number);
}
export declare class NotificationResponseMessage {
    readonly length: number;
    readonly processId: number;
    readonly channel: string;
    readonly payload: string;
    readonly name: MessageName;
    constructor(length: number, processId: number, channel: string, payload: string);
}
export declare class ReadyForQueryMessage {
    readonly length: number;
    readonly status: string;
    readonly name: MessageName;
    constructor(length: number, status: string);
}
export declare class CommandCompleteMessage {
    readonly length: number;
    readonly text: string;
    readonly name: MessageName;
    constructor(length: number, text: string);
}
export declare class DataRowMessage {
    length: number;
    fields: any[];
    readonly fieldCount: number;
    readonly name: MessageName;
    constructor(length: number, fields: any[]);
}
export declare class NoticeMessage implements BackendMessage, NoticeOrError {
    readonly length: number;
    readonly message: string | undefined;
    constructor(length: number, message: string | undefined);
    readonly name = "notice";
    severity: string | undefined;
    code: string | undefined;
    detail: string | undefined;
    hint: string | undefined;
    position: string | undefined;
    internalPosition: string | undefined;
    internalQuery: string | undefined;
    where: string | undefined;
    schema: string | undefined;
    table: string | undefined;
    column: string | undefined;
    dataType: string | undefined;
    constraint: string | undefined;
    file: string | undefined;
    line: string | undefined;
    routine: string | undefined;
}
export {};
