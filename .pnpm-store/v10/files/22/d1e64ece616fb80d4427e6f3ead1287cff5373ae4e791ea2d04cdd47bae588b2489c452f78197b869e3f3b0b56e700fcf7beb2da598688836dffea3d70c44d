/// <reference types="node" />
import * as protobuf from 'protobufjs';
import { ToProto3JSONOptions } from './toproto3json';
import { JSONObject, JSONValue } from './types';
export interface Any {
    type_url: string;
    value: Buffer | Uint8Array;
}
export declare function googleProtobufAnyToProto3JSON(obj: protobuf.Message & Any, options?: ToProto3JSONOptions): JSONObject;
export declare function googleProtobufAnyFromProto3JSON(root: protobuf.Root, json: JSONValue): {
    type_url: string;
    value: null;
} | {
    type_url: string;
    value: string;
};
