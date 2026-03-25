type Primitive = string | number | boolean;
interface Hash {
    [key: string]: Primitive;
}
interface Headers {
    readonly [key: string]: Primitive;
}
type Body = Record<string, unknown> | string;
interface Auth {
    username?: string;
    password?: string;
    readonly [key: string]: Primitive | undefined;
}
interface Params {
    readonly [key: string]: object | Primitive | undefined | null;
}
interface NestedParam {
    [param: string]: Primitive | undefined | null | NestedParam | NestedParamArray;
}
interface NestedParamArray extends Array<Primitive | NestedParam | NestedParamArray> {
}
interface RequestParams {
    readonly auth?: Auth;
    readonly body?: Body;
    readonly headers?: Headers;
    readonly host?: string;
    readonly path?: string;
    readonly params?: Params;
    readonly timeout?: number;
    readonly signal?: AbortSignal;
    [param: string]: object | Primitive | undefined | null | NestedParam | NestedParamArray;
}
type ParameterEncoderFn = (arg: Primitive) => string;

export type { Auth, Body, Hash, Headers, NestedParam, NestedParamArray, ParameterEncoderFn, Params, Primitive, RequestParams };
