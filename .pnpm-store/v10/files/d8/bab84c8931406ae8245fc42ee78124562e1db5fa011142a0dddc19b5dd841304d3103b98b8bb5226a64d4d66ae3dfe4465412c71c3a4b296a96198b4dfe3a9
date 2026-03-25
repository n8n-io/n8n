import { FromObjectValue, JSONObject, JSONValue } from './types';
export interface Struct {
    fields: {
        [key: string]: Value;
    };
}
export interface ListValue {
    values: Array<Value>;
}
export interface Value {
    nullValue?: 0;
    numberValue?: number;
    stringValue?: string;
    boolValue?: boolean;
    listValue?: ListValue;
    structValue?: Struct;
}
export declare function googleProtobufStructToProto3JSON(obj: protobuf.Message & Struct): JSONObject;
export declare function googleProtobufListValueToProto3JSON(obj: protobuf.Message & ListValue): JSONValue[];
export declare function googleProtobufValueToProto3JSON(obj: protobuf.Message & Value): JSONValue;
export declare function googleProtobufStructFromProto3JSON(json: JSONObject): FromObjectValue;
export declare function googleProtobufListValueFromProto3JSON(json: JSONValue[]): FromObjectValue;
export declare function googleProtobufValueFromProto3JSON(json: JSONValue): FromObjectValue;
