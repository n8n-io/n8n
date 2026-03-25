import { HttpRequest as __HttpRequest } from "@smithy/protocol-http";
import { HeaderBag as __HeaderBag, HttpResponse, SerdeContext as __SerdeContext, SerdeContext } from "@smithy/types";
import { tagSymbol } from "./cbor-types";
/**
 * @internal
 */
export declare const parseCborBody: (streamBody: any, context: SerdeContext) => any;
/**
 * @internal
 */
export declare const dateToTag: (date: Date) => {
    tag: number | bigint;
    value: any;
    [tagSymbol]: true;
};
/**
 * @internal
 */
export declare const parseCborErrorBody: (errorBody: any, context: SerdeContext) => Promise<any>;
/**
 * @internal
 */
export declare const loadSmithyRpcV2CborErrorCode: (output: HttpResponse, data: any) => string | undefined;
/**
 * @internal
 */
export declare const checkCborResponse: (response: HttpResponse) => void;
/**
 * @internal
 */
export declare const buildHttpRpcRequest: (context: __SerdeContext, headers: __HeaderBag, path: string, resolvedHostname: string | undefined, body: any) => Promise<__HttpRequest>;
