type Unwrap<T> = T extends Promise<infer U> ? U : T;
type AnyFunction = (...args: any[]) => any;
export type GetResponseTypeFromEndpointMethod<T extends AnyFunction> = Unwrap<ReturnType<T>>;
export type GetResponseDataTypeFromEndpointMethod<T extends AnyFunction> = Unwrap<ReturnType<T>>["data"];
export {};
