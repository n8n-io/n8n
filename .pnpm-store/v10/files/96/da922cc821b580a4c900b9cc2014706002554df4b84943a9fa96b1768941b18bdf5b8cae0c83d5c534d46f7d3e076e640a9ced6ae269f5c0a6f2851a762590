export declare type Method = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options';
export declare type OpenapiPaths<Paths> = {
    [P in keyof Paths]: {
        [M in Method]?: unknown;
    };
};
declare type JSONBody<T> = {
    content: {
        'application/json': T;
    };
} | {
    content: {
        [K in `application/json;${string}`]: T;
    };
};
export declare type OpArgType<OP> = OP extends {
    parameters?: {
        path?: infer P;
        query?: infer Q;
        body?: infer B;
        header?: unknown;
        cookie?: unknown;
    };
    requestBody?: {
        content: {
            'application/json': infer RB;
        } | {
            [K in `application/json;${string}`]: infer RB;
        } | {
            'multipart/form-data': infer FD;
        };
    };
} ? FD extends Record<string, string> ? FormData : P & Q & (B extends Record<string, unknown> ? B[keyof B] : unknown) & RB : Record<string, never>;
declare type OpResponseTypes<OP> = OP extends {
    responses: infer R;
} ? {
    [S in keyof R]: R[S] extends {
        schema?: infer S;
    } ? S : R[S] extends JSONBody<infer C> ? C : S extends 'default' ? R[S] : unknown;
} : never;
declare type _OpReturnType<T> = 200 extends keyof T ? T[200] : 201 extends keyof T ? T[201] : 202 extends keyof T ? T[202] : 'default' extends keyof T ? T['default'] : unknown;
export declare type OpReturnType<OP> = _OpReturnType<OpResponseTypes<OP>>;
declare type _OpDefaultReturnType<T> = 'default' extends keyof T ? T['default'] : unknown;
export declare type OpDefaultReturnType<OP> = _OpDefaultReturnType<OpResponseTypes<OP>>;
declare const never: unique symbol;
declare type _OpErrorType<T> = {
    [S in Exclude<keyof T, 200 | 201 | 202>]: {
        status: S extends 'default' ? typeof never : S;
        data: T[S];
    };
}[Exclude<keyof T, 200 | 201 | 202>];
declare type Coalesce<T, D> = [T] extends [never] ? D : T;
export declare type OpErrorType<OP> = Coalesce<_OpErrorType<OpResponseTypes<OP>>, {
    status: number;
    data: any;
}>;
export declare type CustomRequestInit = Omit<RequestInit, 'headers'> & {
    readonly headers: Headers;
};
export declare type Fetch = (url: string, init: CustomRequestInit) => Promise<ApiResponse>;
export declare type _TypedFetch<OP> = (arg: OpArgType<OP>, init?: RequestInit) => Promise<ApiResponse<OpReturnType<OP>>>;
export declare type TypedFetch<OP> = _TypedFetch<OP> & {
    Error: new (error: ApiError) => ApiError & {
        getActualType: () => OpErrorType<OP>;
    };
};
export declare type FetchArgType<F> = F extends TypedFetch<infer OP> ? OpArgType<OP> : never;
export declare type FetchReturnType<F> = F extends TypedFetch<infer OP> ? OpReturnType<OP> : never;
export declare type FetchErrorType<F> = F extends TypedFetch<infer OP> ? OpErrorType<OP> : never;
declare type _CreateFetch<OP, Q = never> = [Q] extends [never] ? () => TypedFetch<OP> : (query: Q) => TypedFetch<OP>;
export declare type CreateFetch<M, OP> = M extends 'post' | 'put' | 'patch' | 'delete' ? OP extends {
    parameters: {
        query?: infer Q;
    };
} ? _CreateFetch<OP, {
    [K in keyof Q]-?: true | 1;
}> : _CreateFetch<OP> : _CreateFetch<OP>;
export declare type Middleware = (url: string, init: CustomRequestInit, next: Fetch) => Promise<ApiResponse>;
export declare type FetchConfig = {
    baseUrl?: string;
    init?: RequestInit;
    use?: Middleware[];
};
export declare type Request = {
    baseUrl: string;
    method: Method;
    path: string;
    queryParams: string[];
    payload: any;
    init?: RequestInit;
    fetch: Fetch;
};
export declare type ApiResponse<R = any> = {
    readonly headers: Headers;
    readonly url: string;
    readonly ok: boolean;
    readonly status: number;
    readonly statusText: string;
    readonly data: R;
};
export declare class ApiError extends Error {
    readonly headers: Headers;
    readonly url: string;
    readonly status: number;
    readonly statusText: string;
    readonly data: any;
    constructor(response: Omit<ApiResponse, 'ok'>);
}
export {};
