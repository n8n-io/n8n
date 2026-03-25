import { Static } from '../typebox';
export type Insert = Static<typeof Insert>;
export declare const Insert: import("../typebox").TObject<{
    type: import("../typebox").TLiteral<"insert">;
    path: import("../typebox").TString<string>;
    value: import("../typebox").TUnknown;
}>;
export type Update = Static<typeof Update>;
export declare const Update: import("../typebox").TObject<{
    type: import("../typebox").TLiteral<"update">;
    path: import("../typebox").TString<string>;
    value: import("../typebox").TUnknown;
}>;
export type Delete = Static<typeof Delete>;
export declare const Delete: import("../typebox").TObject<{
    type: import("../typebox").TLiteral<"delete">;
    path: import("../typebox").TString<string>;
}>;
export type Edit = Static<typeof Edit>;
export declare const Edit: import("../typebox").TUnion<[import("../typebox").TObject<{
    type: import("../typebox").TLiteral<"insert">;
    path: import("../typebox").TString<string>;
    value: import("../typebox").TUnknown;
}>, import("../typebox").TObject<{
    type: import("../typebox").TLiteral<"update">;
    path: import("../typebox").TString<string>;
    value: import("../typebox").TUnknown;
}>, import("../typebox").TObject<{
    type: import("../typebox").TLiteral<"delete">;
    path: import("../typebox").TString<string>;
}>]>;
export declare class ValueDeltaObjectWithSymbolKeyError extends Error {
    readonly key: unknown;
    constructor(key: unknown);
}
export declare class ValueDeltaUnableToDiffUnknownValue extends Error {
    readonly value: unknown;
    constructor(value: unknown);
}
export declare namespace ValueDelta {
    function Diff(current: unknown, next: unknown): Edit[];
    function Patch<T = any>(current: unknown, edits: Edit[]): T;
}
