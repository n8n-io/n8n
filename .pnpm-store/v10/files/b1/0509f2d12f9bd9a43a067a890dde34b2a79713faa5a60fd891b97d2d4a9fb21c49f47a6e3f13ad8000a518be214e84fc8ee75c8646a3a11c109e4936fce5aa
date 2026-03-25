/// <reference types="node" />

export declare interface ProtocolError extends Error {
    message: string;
    name: string;
}

export declare interface TypeError extends ProtocolError {
    message: string;
    name: string;
}

export interface SimpleError {
  type: string;
  code: string;
  message: string
}

export declare interface ConnectionError extends Error {
    message: string;
    name: string;
    description: string;
    condition: any;
    connection: any;
    toJSON(): SimpleError;//avoids circular reference by omitting connection
}
