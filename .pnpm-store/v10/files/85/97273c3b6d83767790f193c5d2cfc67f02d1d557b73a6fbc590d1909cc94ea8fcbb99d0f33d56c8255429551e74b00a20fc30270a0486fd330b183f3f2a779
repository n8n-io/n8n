import type { Context } from '../context';
import type { Env, MiddlewareHandler, TypedResponse, ValidationTargets, FormValue } from '../types';
import type { InferInput } from './utils';
type ValidationTargetKeysWithBody = 'form' | 'json';
type ValidationTargetByMethod<M> = M extends 'get' | 'head' ? Exclude<keyof ValidationTargets, ValidationTargetKeysWithBody> : keyof ValidationTargets;
export type ValidationFunction<InputType, OutputType, E extends Env = {}, P extends string = string> = (value: InputType, c: Context<E, P>) => OutputType | TypedResponse | Promise<OutputType> | Promise<TypedResponse>;
export type ExtractValidationResponse<VF> = VF extends (value: any, c: any) => infer R ? R extends Promise<infer PR> ? PR extends TypedResponse<infer T, infer S, infer F> ? TypedResponse<T, S, F> : PR extends Response ? PR : PR extends undefined ? never : never : R extends TypedResponse<infer T, infer S, infer F> ? TypedResponse<T, S, F> : R extends Response ? R : R extends undefined ? never : never : never;
export declare const validator: <InputType, P extends string, M extends string, U extends ValidationTargetByMethod<M>, P2 extends string = P, VF extends (value: unknown extends InputType ? ValidationTargets[U] : InputType, c: Context<any, P2>) => any = (value: unknown extends InputType ? ValidationTargets[U] : InputType, c: Context<any, P2>) => any, V extends {
    in: { [K in U]: K extends "json" ? unknown extends InputType ? ExtractValidatorOutput<VF> : InputType : InferInput<ExtractValidatorOutput<VF>, K, FormValue>; };
    out: { [K in U]: ExtractValidatorOutput<VF>; };
} = {
    in: { [K in U]: K extends "json" ? unknown extends InputType ? ExtractValidatorOutput<VF> : InputType : InferInput<ExtractValidatorOutput<VF>, K, FormValue>; };
    out: { [K in U]: ExtractValidatorOutput<VF>; };
}, E extends Env = any>(target: U, validationFunc: VF) => MiddlewareHandler<E, P, V, ExtractValidationResponse<VF>>;
export type ExtractValidatorOutput<VF> = VF extends (value: any, c: any) => infer R ? R extends Promise<infer PR> ? PR extends Response | TypedResponse<any, any, any> ? never : PR : R extends Response | TypedResponse<any, any, any> ? never : R : never;
export {};
