import _m0 from "protobufjs/minimal.js";
import { BooleanArray, Filters, GeoCoordinatesFilter, IntArray, NumberArray, TextArray } from "./base.js";
import { Hybrid, NearAudioSearch, NearDepthSearch, NearImageSearch, NearIMUSearch, NearObject, NearTextSearch, NearThermalSearch, NearVector, NearVideoSearch } from "./base_search.js";
export declare const protobufPackage = "weaviate.v1";
export interface AggregateRequest {
    /** required */
    collection: string;
    /** parameters */
    tenant: string;
    /** what is returned */
    objectsCount: boolean;
    aggregations: AggregateRequest_Aggregation[];
    /** affects aggregation results */
    objectLimit?: number | undefined;
    groupBy?: AggregateRequest_GroupBy | undefined;
    limit?: number | undefined;
    /** matches/searches for objects */
    filters?: Filters | undefined;
    hybrid?: Hybrid | undefined;
    nearVector?: NearVector | undefined;
    nearObject?: NearObject | undefined;
    nearText?: NearTextSearch | undefined;
    nearImage?: NearImageSearch | undefined;
    nearAudio?: NearAudioSearch | undefined;
    nearVideo?: NearVideoSearch | undefined;
    nearDepth?: NearDepthSearch | undefined;
    nearThermal?: NearThermalSearch | undefined;
    nearImu?: NearIMUSearch | undefined;
}
export interface AggregateRequest_Aggregation {
    property: string;
    int?: AggregateRequest_Aggregation_Integer | undefined;
    number?: AggregateRequest_Aggregation_Number | undefined;
    text?: AggregateRequest_Aggregation_Text | undefined;
    boolean?: AggregateRequest_Aggregation_Boolean | undefined;
    date?: AggregateRequest_Aggregation_DateMessage | undefined;
    reference?: AggregateRequest_Aggregation_Reference | undefined;
}
export interface AggregateRequest_Aggregation_Integer {
    count: boolean;
    type: boolean;
    sum: boolean;
    mean: boolean;
    mode: boolean;
    median: boolean;
    maximum: boolean;
    minimum: boolean;
}
export interface AggregateRequest_Aggregation_Number {
    count: boolean;
    type: boolean;
    sum: boolean;
    mean: boolean;
    mode: boolean;
    median: boolean;
    maximum: boolean;
    minimum: boolean;
}
export interface AggregateRequest_Aggregation_Text {
    count: boolean;
    type: boolean;
    topOccurences: boolean;
    topOccurencesLimit?: number | undefined;
}
export interface AggregateRequest_Aggregation_Boolean {
    count: boolean;
    type: boolean;
    totalTrue: boolean;
    totalFalse: boolean;
    percentageTrue: boolean;
    percentageFalse: boolean;
}
export interface AggregateRequest_Aggregation_DateMessage {
    count: boolean;
    type: boolean;
    median: boolean;
    mode: boolean;
    maximum: boolean;
    minimum: boolean;
}
export interface AggregateRequest_Aggregation_Reference {
    type: boolean;
    pointingTo: boolean;
}
export interface AggregateRequest_GroupBy {
    collection: string;
    property: string;
}
export interface AggregateReply {
    took: number;
    singleResult?: AggregateReply_Single | undefined;
    groupedResults?: AggregateReply_Grouped | undefined;
}
export interface AggregateReply_Aggregations {
    aggregations: AggregateReply_Aggregations_Aggregation[];
}
export interface AggregateReply_Aggregations_Aggregation {
    property: string;
    int?: AggregateReply_Aggregations_Aggregation_Integer | undefined;
    number?: AggregateReply_Aggregations_Aggregation_Number | undefined;
    text?: AggregateReply_Aggregations_Aggregation_Text | undefined;
    boolean?: AggregateReply_Aggregations_Aggregation_Boolean | undefined;
    date?: AggregateReply_Aggregations_Aggregation_DateMessage | undefined;
    reference?: AggregateReply_Aggregations_Aggregation_Reference | undefined;
}
export interface AggregateReply_Aggregations_Aggregation_Integer {
    count?: number | undefined;
    type?: string | undefined;
    mean?: number | undefined;
    median?: number | undefined;
    mode?: number | undefined;
    maximum?: number | undefined;
    minimum?: number | undefined;
    sum?: number | undefined;
}
export interface AggregateReply_Aggregations_Aggregation_Number {
    count?: number | undefined;
    type?: string | undefined;
    mean?: number | undefined;
    median?: number | undefined;
    mode?: number | undefined;
    maximum?: number | undefined;
    minimum?: number | undefined;
    sum?: number | undefined;
}
export interface AggregateReply_Aggregations_Aggregation_Text {
    count?: number | undefined;
    type?: string | undefined;
    topOccurences?: AggregateReply_Aggregations_Aggregation_Text_TopOccurrences | undefined;
}
export interface AggregateReply_Aggregations_Aggregation_Text_TopOccurrences {
    items: AggregateReply_Aggregations_Aggregation_Text_TopOccurrences_TopOccurrence[];
}
export interface AggregateReply_Aggregations_Aggregation_Text_TopOccurrences_TopOccurrence {
    value: string;
    occurs: number;
}
export interface AggregateReply_Aggregations_Aggregation_Boolean {
    count?: number | undefined;
    type?: string | undefined;
    totalTrue?: number | undefined;
    totalFalse?: number | undefined;
    percentageTrue?: number | undefined;
    percentageFalse?: number | undefined;
}
export interface AggregateReply_Aggregations_Aggregation_DateMessage {
    count?: number | undefined;
    type?: string | undefined;
    median?: string | undefined;
    mode?: string | undefined;
    maximum?: string | undefined;
    minimum?: string | undefined;
}
export interface AggregateReply_Aggregations_Aggregation_Reference {
    type?: string | undefined;
    /** protolint:disable:next REPEATED_FIELD_NAMES_PLURALIZED */
    pointingTo: string[];
}
export interface AggregateReply_Single {
    objectsCount?: number | undefined;
    aggregations?: AggregateReply_Aggregations | undefined;
}
export interface AggregateReply_Group {
    objectsCount?: number | undefined;
    aggregations?: AggregateReply_Aggregations | undefined;
    groupedBy?: AggregateReply_Group_GroupedBy | undefined;
}
export interface AggregateReply_Group_GroupedBy {
    /** protolint:disable:next REPEATED_FIELD_NAMES_PLURALIZED */
    path: string[];
    text?: string | undefined;
    int?: number | undefined;
    boolean?: boolean | undefined;
    number?: number | undefined;
    texts?: TextArray | undefined;
    ints?: IntArray | undefined;
    booleans?: BooleanArray | undefined;
    numbers?: NumberArray | undefined;
    geo?: GeoCoordinatesFilter | undefined;
}
export interface AggregateReply_Grouped {
    groups: AggregateReply_Group[];
}
export declare const AggregateRequest: {
    encode(message: AggregateRequest, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): AggregateRequest;
    fromJSON(object: any): AggregateRequest;
    toJSON(message: AggregateRequest): unknown;
    create(base?: DeepPartial<AggregateRequest>): AggregateRequest;
    fromPartial(object: DeepPartial<AggregateRequest>): AggregateRequest;
};
export declare const AggregateRequest_Aggregation: {
    encode(message: AggregateRequest_Aggregation, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): AggregateRequest_Aggregation;
    fromJSON(object: any): AggregateRequest_Aggregation;
    toJSON(message: AggregateRequest_Aggregation): unknown;
    create(base?: DeepPartial<AggregateRequest_Aggregation>): AggregateRequest_Aggregation;
    fromPartial(object: DeepPartial<AggregateRequest_Aggregation>): AggregateRequest_Aggregation;
};
export declare const AggregateRequest_Aggregation_Integer: {
    encode(message: AggregateRequest_Aggregation_Integer, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): AggregateRequest_Aggregation_Integer;
    fromJSON(object: any): AggregateRequest_Aggregation_Integer;
    toJSON(message: AggregateRequest_Aggregation_Integer): unknown;
    create(base?: DeepPartial<AggregateRequest_Aggregation_Integer>): AggregateRequest_Aggregation_Integer;
    fromPartial(object: DeepPartial<AggregateRequest_Aggregation_Integer>): AggregateRequest_Aggregation_Integer;
};
export declare const AggregateRequest_Aggregation_Number: {
    encode(message: AggregateRequest_Aggregation_Number, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): AggregateRequest_Aggregation_Number;
    fromJSON(object: any): AggregateRequest_Aggregation_Number;
    toJSON(message: AggregateRequest_Aggregation_Number): unknown;
    create(base?: DeepPartial<AggregateRequest_Aggregation_Number>): AggregateRequest_Aggregation_Number;
    fromPartial(object: DeepPartial<AggregateRequest_Aggregation_Number>): AggregateRequest_Aggregation_Number;
};
export declare const AggregateRequest_Aggregation_Text: {
    encode(message: AggregateRequest_Aggregation_Text, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): AggregateRequest_Aggregation_Text;
    fromJSON(object: any): AggregateRequest_Aggregation_Text;
    toJSON(message: AggregateRequest_Aggregation_Text): unknown;
    create(base?: DeepPartial<AggregateRequest_Aggregation_Text>): AggregateRequest_Aggregation_Text;
    fromPartial(object: DeepPartial<AggregateRequest_Aggregation_Text>): AggregateRequest_Aggregation_Text;
};
export declare const AggregateRequest_Aggregation_Boolean: {
    encode(message: AggregateRequest_Aggregation_Boolean, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): AggregateRequest_Aggregation_Boolean;
    fromJSON(object: any): AggregateRequest_Aggregation_Boolean;
    toJSON(message: AggregateRequest_Aggregation_Boolean): unknown;
    create(base?: DeepPartial<AggregateRequest_Aggregation_Boolean>): AggregateRequest_Aggregation_Boolean;
    fromPartial(object: DeepPartial<AggregateRequest_Aggregation_Boolean>): AggregateRequest_Aggregation_Boolean;
};
export declare const AggregateRequest_Aggregation_DateMessage: {
    encode(message: AggregateRequest_Aggregation_DateMessage, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): AggregateRequest_Aggregation_DateMessage;
    fromJSON(object: any): AggregateRequest_Aggregation_DateMessage;
    toJSON(message: AggregateRequest_Aggregation_DateMessage): unknown;
    create(base?: DeepPartial<AggregateRequest_Aggregation_DateMessage>): AggregateRequest_Aggregation_DateMessage;
    fromPartial(object: DeepPartial<AggregateRequest_Aggregation_DateMessage>): AggregateRequest_Aggregation_DateMessage;
};
export declare const AggregateRequest_Aggregation_Reference: {
    encode(message: AggregateRequest_Aggregation_Reference, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): AggregateRequest_Aggregation_Reference;
    fromJSON(object: any): AggregateRequest_Aggregation_Reference;
    toJSON(message: AggregateRequest_Aggregation_Reference): unknown;
    create(base?: DeepPartial<AggregateRequest_Aggregation_Reference>): AggregateRequest_Aggregation_Reference;
    fromPartial(object: DeepPartial<AggregateRequest_Aggregation_Reference>): AggregateRequest_Aggregation_Reference;
};
export declare const AggregateRequest_GroupBy: {
    encode(message: AggregateRequest_GroupBy, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): AggregateRequest_GroupBy;
    fromJSON(object: any): AggregateRequest_GroupBy;
    toJSON(message: AggregateRequest_GroupBy): unknown;
    create(base?: DeepPartial<AggregateRequest_GroupBy>): AggregateRequest_GroupBy;
    fromPartial(object: DeepPartial<AggregateRequest_GroupBy>): AggregateRequest_GroupBy;
};
export declare const AggregateReply: {
    encode(message: AggregateReply, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): AggregateReply;
    fromJSON(object: any): AggregateReply;
    toJSON(message: AggregateReply): unknown;
    create(base?: DeepPartial<AggregateReply>): AggregateReply;
    fromPartial(object: DeepPartial<AggregateReply>): AggregateReply;
};
export declare const AggregateReply_Aggregations: {
    encode(message: AggregateReply_Aggregations, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): AggregateReply_Aggregations;
    fromJSON(object: any): AggregateReply_Aggregations;
    toJSON(message: AggregateReply_Aggregations): unknown;
    create(base?: DeepPartial<AggregateReply_Aggregations>): AggregateReply_Aggregations;
    fromPartial(object: DeepPartial<AggregateReply_Aggregations>): AggregateReply_Aggregations;
};
export declare const AggregateReply_Aggregations_Aggregation: {
    encode(message: AggregateReply_Aggregations_Aggregation, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): AggregateReply_Aggregations_Aggregation;
    fromJSON(object: any): AggregateReply_Aggregations_Aggregation;
    toJSON(message: AggregateReply_Aggregations_Aggregation): unknown;
    create(base?: DeepPartial<AggregateReply_Aggregations_Aggregation>): AggregateReply_Aggregations_Aggregation;
    fromPartial(object: DeepPartial<AggregateReply_Aggregations_Aggregation>): AggregateReply_Aggregations_Aggregation;
};
export declare const AggregateReply_Aggregations_Aggregation_Integer: {
    encode(message: AggregateReply_Aggregations_Aggregation_Integer, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): AggregateReply_Aggregations_Aggregation_Integer;
    fromJSON(object: any): AggregateReply_Aggregations_Aggregation_Integer;
    toJSON(message: AggregateReply_Aggregations_Aggregation_Integer): unknown;
    create(base?: DeepPartial<AggregateReply_Aggregations_Aggregation_Integer>): AggregateReply_Aggregations_Aggregation_Integer;
    fromPartial(object: DeepPartial<AggregateReply_Aggregations_Aggregation_Integer>): AggregateReply_Aggregations_Aggregation_Integer;
};
export declare const AggregateReply_Aggregations_Aggregation_Number: {
    encode(message: AggregateReply_Aggregations_Aggregation_Number, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): AggregateReply_Aggregations_Aggregation_Number;
    fromJSON(object: any): AggregateReply_Aggregations_Aggregation_Number;
    toJSON(message: AggregateReply_Aggregations_Aggregation_Number): unknown;
    create(base?: DeepPartial<AggregateReply_Aggregations_Aggregation_Number>): AggregateReply_Aggregations_Aggregation_Number;
    fromPartial(object: DeepPartial<AggregateReply_Aggregations_Aggregation_Number>): AggregateReply_Aggregations_Aggregation_Number;
};
export declare const AggregateReply_Aggregations_Aggregation_Text: {
    encode(message: AggregateReply_Aggregations_Aggregation_Text, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): AggregateReply_Aggregations_Aggregation_Text;
    fromJSON(object: any): AggregateReply_Aggregations_Aggregation_Text;
    toJSON(message: AggregateReply_Aggregations_Aggregation_Text): unknown;
    create(base?: DeepPartial<AggregateReply_Aggregations_Aggregation_Text>): AggregateReply_Aggregations_Aggregation_Text;
    fromPartial(object: DeepPartial<AggregateReply_Aggregations_Aggregation_Text>): AggregateReply_Aggregations_Aggregation_Text;
};
export declare const AggregateReply_Aggregations_Aggregation_Text_TopOccurrences: {
    encode(message: AggregateReply_Aggregations_Aggregation_Text_TopOccurrences, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): AggregateReply_Aggregations_Aggregation_Text_TopOccurrences;
    fromJSON(object: any): AggregateReply_Aggregations_Aggregation_Text_TopOccurrences;
    toJSON(message: AggregateReply_Aggregations_Aggregation_Text_TopOccurrences): unknown;
    create(base?: DeepPartial<AggregateReply_Aggregations_Aggregation_Text_TopOccurrences>): AggregateReply_Aggregations_Aggregation_Text_TopOccurrences;
    fromPartial(object: DeepPartial<AggregateReply_Aggregations_Aggregation_Text_TopOccurrences>): AggregateReply_Aggregations_Aggregation_Text_TopOccurrences;
};
export declare const AggregateReply_Aggregations_Aggregation_Text_TopOccurrences_TopOccurrence: {
    encode(message: AggregateReply_Aggregations_Aggregation_Text_TopOccurrences_TopOccurrence, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): AggregateReply_Aggregations_Aggregation_Text_TopOccurrences_TopOccurrence;
    fromJSON(object: any): AggregateReply_Aggregations_Aggregation_Text_TopOccurrences_TopOccurrence;
    toJSON(message: AggregateReply_Aggregations_Aggregation_Text_TopOccurrences_TopOccurrence): unknown;
    create(base?: DeepPartial<AggregateReply_Aggregations_Aggregation_Text_TopOccurrences_TopOccurrence>): AggregateReply_Aggregations_Aggregation_Text_TopOccurrences_TopOccurrence;
    fromPartial(object: DeepPartial<AggregateReply_Aggregations_Aggregation_Text_TopOccurrences_TopOccurrence>): AggregateReply_Aggregations_Aggregation_Text_TopOccurrences_TopOccurrence;
};
export declare const AggregateReply_Aggregations_Aggregation_Boolean: {
    encode(message: AggregateReply_Aggregations_Aggregation_Boolean, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): AggregateReply_Aggregations_Aggregation_Boolean;
    fromJSON(object: any): AggregateReply_Aggregations_Aggregation_Boolean;
    toJSON(message: AggregateReply_Aggregations_Aggregation_Boolean): unknown;
    create(base?: DeepPartial<AggregateReply_Aggregations_Aggregation_Boolean>): AggregateReply_Aggregations_Aggregation_Boolean;
    fromPartial(object: DeepPartial<AggregateReply_Aggregations_Aggregation_Boolean>): AggregateReply_Aggregations_Aggregation_Boolean;
};
export declare const AggregateReply_Aggregations_Aggregation_DateMessage: {
    encode(message: AggregateReply_Aggregations_Aggregation_DateMessage, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): AggregateReply_Aggregations_Aggregation_DateMessage;
    fromJSON(object: any): AggregateReply_Aggregations_Aggregation_DateMessage;
    toJSON(message: AggregateReply_Aggregations_Aggregation_DateMessage): unknown;
    create(base?: DeepPartial<AggregateReply_Aggregations_Aggregation_DateMessage>): AggregateReply_Aggregations_Aggregation_DateMessage;
    fromPartial(object: DeepPartial<AggregateReply_Aggregations_Aggregation_DateMessage>): AggregateReply_Aggregations_Aggregation_DateMessage;
};
export declare const AggregateReply_Aggregations_Aggregation_Reference: {
    encode(message: AggregateReply_Aggregations_Aggregation_Reference, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): AggregateReply_Aggregations_Aggregation_Reference;
    fromJSON(object: any): AggregateReply_Aggregations_Aggregation_Reference;
    toJSON(message: AggregateReply_Aggregations_Aggregation_Reference): unknown;
    create(base?: DeepPartial<AggregateReply_Aggregations_Aggregation_Reference>): AggregateReply_Aggregations_Aggregation_Reference;
    fromPartial(object: DeepPartial<AggregateReply_Aggregations_Aggregation_Reference>): AggregateReply_Aggregations_Aggregation_Reference;
};
export declare const AggregateReply_Single: {
    encode(message: AggregateReply_Single, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): AggregateReply_Single;
    fromJSON(object: any): AggregateReply_Single;
    toJSON(message: AggregateReply_Single): unknown;
    create(base?: DeepPartial<AggregateReply_Single>): AggregateReply_Single;
    fromPartial(object: DeepPartial<AggregateReply_Single>): AggregateReply_Single;
};
export declare const AggregateReply_Group: {
    encode(message: AggregateReply_Group, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): AggregateReply_Group;
    fromJSON(object: any): AggregateReply_Group;
    toJSON(message: AggregateReply_Group): unknown;
    create(base?: DeepPartial<AggregateReply_Group>): AggregateReply_Group;
    fromPartial(object: DeepPartial<AggregateReply_Group>): AggregateReply_Group;
};
export declare const AggregateReply_Group_GroupedBy: {
    encode(message: AggregateReply_Group_GroupedBy, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): AggregateReply_Group_GroupedBy;
    fromJSON(object: any): AggregateReply_Group_GroupedBy;
    toJSON(message: AggregateReply_Group_GroupedBy): unknown;
    create(base?: DeepPartial<AggregateReply_Group_GroupedBy>): AggregateReply_Group_GroupedBy;
    fromPartial(object: DeepPartial<AggregateReply_Group_GroupedBy>): AggregateReply_Group_GroupedBy;
};
export declare const AggregateReply_Grouped: {
    encode(message: AggregateReply_Grouped, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): AggregateReply_Grouped;
    fromJSON(object: any): AggregateReply_Grouped;
    toJSON(message: AggregateReply_Grouped): unknown;
    create(base?: DeepPartial<AggregateReply_Grouped>): AggregateReply_Grouped;
    fromPartial(object: DeepPartial<AggregateReply_Grouped>): AggregateReply_Grouped;
};
type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;
export type DeepPartial<T> = T extends Builtin ? T : T extends globalThis.Array<infer U> ? globalThis.Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>> : T extends {} ? {
    [K in keyof T]?: DeepPartial<T[K]>;
} : Partial<T>;
export {};
