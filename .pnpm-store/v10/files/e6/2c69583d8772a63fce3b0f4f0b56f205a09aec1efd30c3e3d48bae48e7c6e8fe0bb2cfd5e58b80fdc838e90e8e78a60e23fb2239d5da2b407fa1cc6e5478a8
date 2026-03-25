/**
 * @module
 * This module contains some type definitions for the Hono modules.
 */
import type { Context } from './context';
import type { HonoBase } from './hono-base';
import type { CustomHeader, RequestHeader } from './utils/headers';
import type { StatusCode } from './utils/http-status';
import type { IfAnyThenEmptyObject, IsAny, JSONValue, RemoveBlankRecord, Simplify, UnionToIntersection } from './utils/types';
export type Bindings = object;
export type Variables = object;
export type BlankEnv = {};
export type Env = {
    Bindings?: Bindings;
    Variables?: Variables;
};
export type Next = () => Promise<void>;
export type ExtractInput<I extends Input | Input['in']> = I extends Input ? unknown extends I['in'] ? {} : I['in'] : I;
export type Input = {
    in?: {};
    out?: {};
    outputFormat?: ResponseFormat;
};
export type BlankSchema = {};
export type BlankInput = {};
export interface RouterRoute {
    basePath: string;
    path: string;
    method: string;
    handler: H;
}
export type HandlerResponse<O> = Response | TypedResponse<O> | Promise<Response | TypedResponse<O>> | Promise<void>;
export type Handler<E extends Env = any, P extends string = any, I extends Input = BlankInput, R extends HandlerResponse<any> = any> = (c: Context<E, P, I>, next: Next) => R;
export type MiddlewareHandler<E extends Env = any, P extends string = string, I extends Input = {}, R extends HandlerResponse<any> = Response> = (c: Context<E, P, I>, next: Next) => Promise<R | void>;
export type H<E extends Env = any, P extends string = any, I extends Input = BlankInput, R extends HandlerResponse<any> = any> = Handler<E, P, I, R> | MiddlewareHandler<E, P, I, R>;
/**
 * You can extend this interface to define a custom `c.notFound()` Response type.
 *
 * @example
 * declare module 'hono' {
 *   interface NotFoundResponse extends Response, TypedResponse<string, 404, 'text'> {}
 * }
 */
export interface NotFoundResponse {
}
export type NotFoundHandler<E extends Env = any> = (c: Context<E>) => NotFoundResponse extends Response ? NotFoundResponse | Promise<NotFoundResponse> : Response | Promise<Response>;
export interface HTTPResponseError extends Error {
    getResponse: () => Response;
}
export type ErrorHandler<E extends Env = any> = (err: Error | HTTPResponseError, c: Context<E>) => Response | Promise<Response>;
export interface HandlerInterface<E extends Env = Env, M extends string = string, S extends Schema = BlankSchema, BasePath extends string = '/', CurrentPath extends string = BasePath> {
    <P extends string = CurrentPath, I extends Input = BlankInput, R extends HandlerResponse<any> = any, E2 extends Env = E>(handler: H<E2, P, I, R>): HonoBase<IntersectNonAnyTypes<[E, E2]>, S & ToSchema<M, P, I, MergeTypedResponse<R>>, BasePath, CurrentPath>;
    <P extends string = CurrentPath, I extends Input = BlankInput, I2 extends Input = I, R extends HandlerResponse<any> = any, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, M1 extends H<E2, P, I> = H<E2, P, I>>(...handlers: [H<E2, P, I> & M1, H<E3, P, I2, R>]): HonoBase<IntersectNonAnyTypes<[E, E2, E3]>, S & ToSchema<M, P, I2, MergeTypedResponse<R> | MergeMiddlewareResponse<M1>>, BasePath, CurrentPath>;
    <P extends string, MergedPath extends MergePath<BasePath, P>, R extends HandlerResponse<any> = any, I extends Input = BlankInput, E2 extends Env = E>(path: P, handler: H<E2, MergedPath, I, R>): HonoBase<E, AddSchemaIfHasResponse<MergeTypedResponse<R>, S, M, P, I, BasePath>, BasePath, MergePath<BasePath, P>>;
    <P extends string = CurrentPath, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, I3 extends Input = I & I2, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, M1 extends H<E2, P, I> = H<E2, P, I>, M2 extends H<E3, P, I2> = H<E3, P, I2>>(...handlers: [H<E2, P, I> & M1, H<E3, P, I2> & M2, H<E4, P, I3, R>]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4]>, S & ToSchema<M, P, I3, MergeTypedResponse<R> | MergeMiddlewareResponse<M1> | MergeMiddlewareResponse<M2>>, BasePath, CurrentPath>;
    <P extends string, MergedPath extends MergePath<BasePath, P>, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, M1 extends H<E2, MergedPath, I> = H<E2, MergedPath, I>>(path: P, ...handlers: [H<E2, MergedPath, I> & M1, H<E3, MergedPath, I2, R>]): HonoBase<E, AddSchemaIfHasResponse<MergeTypedResponse<R> | MergeMiddlewareResponse<M1>, S, M, P, I2, BasePath>, BasePath, MergePath<BasePath, P>>;
    <P extends string = CurrentPath, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, M1 extends H<E2, P, I> = H<E2, P, I>, M2 extends H<E3, P, I2> = H<E3, P, I2>, M3 extends H<E4, P, I3> = H<E4, P, I3>>(...handlers: [H<E2, P, I> & M1, H<E3, P, I2> & M2, H<E4, P, I3> & M3, H<E5, P, I4, R>]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, S & ToSchema<M, P, I4, MergeTypedResponse<R> | MergeMiddlewareResponse<M1> | MergeMiddlewareResponse<M2> | MergeMiddlewareResponse<M3>>, BasePath, CurrentPath>;
    <P extends string, MergedPath extends MergePath<BasePath, P>, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, I3 extends Input = I & I2, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, M1 extends H<E2, MergedPath, I> = H<E2, MergedPath, I>, M2 extends H<E3, MergedPath, I2> = H<E3, MergedPath, I2>>(path: P, ...handlers: [H<E2, MergedPath, I> & M1, H<E3, MergedPath, I2> & M2, H<E4, MergedPath, I3, R>]): HonoBase<E, AddSchemaIfHasResponse<MergeTypedResponse<R> | MergeMiddlewareResponse<M1> | MergeMiddlewareResponse<M2>, S, M, P, I3, BasePath>, BasePath, MergePath<BasePath, P>>;
    <P extends string = CurrentPath, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, I5 extends Input = I & I2 & I3 & I4, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, M1 extends H<E2, P, I> = H<E2, P, I>, M2 extends H<E3, P, I2> = H<E3, P, I2>, M3 extends H<E4, P, I3> = H<E4, P, I3>, M4 extends H<E5, P, I4> = H<E5, P, I4>>(...handlers: [
        H<E2, P, I> & M1,
        H<E3, P, I2> & M2,
        H<E4, P, I3> & M3,
        H<E5, P, I4> & M4,
        H<E6, P, I5, R>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, S & ToSchema<M, P, I5, MergeTypedResponse<R> | MergeMiddlewareResponse<M1> | MergeMiddlewareResponse<M2> | MergeMiddlewareResponse<M3> | MergeMiddlewareResponse<M4>>, BasePath, CurrentPath>;
    <P extends string, MergedPath extends MergePath<BasePath, P>, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, M1 extends H<E2, MergedPath, I> = H<E2, MergedPath, I>, M2 extends H<E3, MergedPath, I2> = H<E3, MergedPath, I2>, M3 extends H<E4, MergedPath, I3> = H<E4, MergedPath, I3>>(path: P, ...handlers: [
        H<E2, MergedPath, I> & M1,
        H<E3, MergedPath, I2> & M2,
        H<E4, MergedPath, I3> & M3,
        H<E5, MergedPath, I4, R>
    ]): HonoBase<E, AddSchemaIfHasResponse<MergeTypedResponse<R> | MergeMiddlewareResponse<M1> | MergeMiddlewareResponse<M2> | MergeMiddlewareResponse<M3>, S, M, P, I4, BasePath>, BasePath, MergePath<BasePath, P>>;
    <P extends string = CurrentPath, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, I5 extends Input = I & I2 & I3 & I4, I6 extends Input = I & I2 & I3 & I4 & I5, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, M1 extends H<E2, P, I> = H<E2, P, I>, M2 extends H<E3, P, I2> = H<E3, P, I2>, M3 extends H<E4, P, I3> = H<E4, P, I3>, M4 extends H<E5, P, I4> = H<E5, P, I4>, M5 extends H<E6, P, I5> = H<E6, P, I5>>(...handlers: [
        H<E2, P, I> & M1,
        H<E3, P, I2> & M2,
        H<E4, P, I3> & M3,
        H<E5, P, I4> & M4,
        H<E6, P, I5> & M5,
        H<E7, P, I6, R>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>, S & ToSchema<M, P, I6, MergeTypedResponse<R> | MergeMiddlewareResponse<M1> | MergeMiddlewareResponse<M2> | MergeMiddlewareResponse<M3> | MergeMiddlewareResponse<M4> | MergeMiddlewareResponse<M5>>, BasePath, CurrentPath>;
    <P extends string, MergedPath extends MergePath<BasePath, P>, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, I5 extends Input = I & I2 & I3 & I4, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, M1 extends H<E2, MergedPath, I> = H<E2, MergedPath, I>, M2 extends H<E3, MergedPath, I2> = H<E3, MergedPath, I2>, M3 extends H<E4, MergedPath, I3> = H<E4, MergedPath, I3>, M4 extends H<E5, MergedPath, I4> = H<E5, MergedPath, I4>>(path: P, ...handlers: [
        H<E2, MergedPath, I> & M1,
        H<E3, MergedPath, I2> & M2,
        H<E4, MergedPath, I3> & M3,
        H<E5, MergedPath, I4> & M4,
        H<E6, MergedPath, I5, R>
    ]): HonoBase<E, AddSchemaIfHasResponse<MergeTypedResponse<R> | MergeMiddlewareResponse<M1> | MergeMiddlewareResponse<M2> | MergeMiddlewareResponse<M3> | MergeMiddlewareResponse<M4>, S, M, P, I5, BasePath>, BasePath, MergePath<BasePath, P>>;
    <P extends string = CurrentPath, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, I5 extends Input = I & I2 & I3 & I4, I6 extends Input = I & I2 & I3 & I4 & I5, I7 extends Input = I & I2 & I3 & I4 & I5 & I6, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>, M1 extends H<E2, P, I> = H<E2, P, I>, M2 extends H<E3, P, I2> = H<E3, P, I2>, M3 extends H<E4, P, I3> = H<E4, P, I3>, M4 extends H<E5, P, I4> = H<E5, P, I4>, M5 extends H<E6, P, I5> = H<E6, P, I5>, M6 extends H<E7, P, I6> = H<E7, P, I6>>(...handlers: [
        H<E2, P, I> & M1,
        H<E3, P, I2> & M2,
        H<E4, P, I3> & M3,
        H<E5, P, I4> & M4,
        H<E6, P, I5> & M5,
        H<E7, P, I6> & M6,
        H<E8, P, I7, R>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>, S & ToSchema<M, P, I7, MergeTypedResponse<R> | MergeMiddlewareResponse<M1> | MergeMiddlewareResponse<M2> | MergeMiddlewareResponse<M3> | MergeMiddlewareResponse<M4> | MergeMiddlewareResponse<M5> | MergeMiddlewareResponse<M6>>, BasePath, CurrentPath>;
    <P extends string, MergedPath extends MergePath<BasePath, P>, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, I5 extends Input = I & I2 & I3 & I4, I6 extends Input = I & I2 & I3 & I4 & I5, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, M1 extends H<E2, MergedPath, I> = H<E2, MergedPath, I>, M2 extends H<E3, MergedPath, I2> = H<E3, MergedPath, I2>, M3 extends H<E4, MergedPath, I3> = H<E4, MergedPath, I3>, M4 extends H<E5, MergedPath, I4> = H<E5, MergedPath, I4>, M5 extends H<E6, MergedPath, I5> = H<E6, MergedPath, I5>>(path: P, ...handlers: [
        H<E2, MergedPath, I> & M1,
        H<E3, MergedPath, I2> & M2,
        H<E4, MergedPath, I3> & M3,
        H<E5, MergedPath, I4> & M4,
        H<E6, MergedPath, I5> & M5,
        H<E7, MergedPath, I6, R>
    ]): HonoBase<E, AddSchemaIfHasResponse<MergeTypedResponse<R> | MergeMiddlewareResponse<M1> | MergeMiddlewareResponse<M2> | MergeMiddlewareResponse<M3> | MergeMiddlewareResponse<M4> | MergeMiddlewareResponse<M5>, S, M, P, I6, BasePath>, BasePath, MergePath<BasePath, P>>;
    <P extends string = CurrentPath, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, I5 extends Input = I & I2 & I3 & I4, I6 extends Input = I & I2 & I3 & I4 & I5, I7 extends Input = I & I2 & I3 & I4 & I5 & I6, I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>, M1 extends H<E2, P, I> = H<E2, P, I>, M2 extends H<E3, P, I2> = H<E3, P, I2>, M3 extends H<E4, P, I3> = H<E4, P, I3>, M4 extends H<E5, P, I4> = H<E5, P, I4>, M5 extends H<E6, P, I5> = H<E6, P, I5>, M6 extends H<E7, P, I6> = H<E7, P, I6>, M7 extends H<E8, P, I7> = H<E8, P, I7>>(...handlers: [
        H<E2, P, I> & M1,
        H<E3, P, I2> & M2,
        H<E4, P, I3> & M3,
        H<E5, P, I4> & M4,
        H<E6, P, I5> & M5,
        H<E7, P, I6> & M6,
        H<E8, P, I7> & M7,
        H<E9, P, I8, R>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>, S & ToSchema<M, P, I8, MergeTypedResponse<R> | MergeMiddlewareResponse<M1> | MergeMiddlewareResponse<M2> | MergeMiddlewareResponse<M3> | MergeMiddlewareResponse<M4> | MergeMiddlewareResponse<M5> | MergeMiddlewareResponse<M6> | MergeMiddlewareResponse<M7>>, BasePath, CurrentPath>;
    <P extends string, MergedPath extends MergePath<BasePath, P>, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, I5 extends Input = I & I2 & I3 & I4, I6 extends Input = I & I2 & I3 & I4 & I5, I7 extends Input = I & I2 & I3 & I4 & I5 & I6, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>, M1 extends H<E2, MergedPath, I> = H<E2, MergedPath, I>, M2 extends H<E3, MergedPath, I2> = H<E3, MergedPath, I2>, M3 extends H<E4, MergedPath, I3> = H<E4, MergedPath, I3>, M4 extends H<E5, MergedPath, I4> = H<E5, MergedPath, I4>, M5 extends H<E6, MergedPath, I5> = H<E6, MergedPath, I5>, M6 extends H<E7, MergedPath, I6> = H<E7, MergedPath, I6>>(path: P, ...handlers: [
        H<E2, MergedPath, I> & M1,
        H<E3, MergedPath, I2> & M2,
        H<E4, MergedPath, I3> & M3,
        H<E5, MergedPath, I4> & M4,
        H<E6, MergedPath, I5> & M5,
        H<E7, MergedPath, I6> & M6,
        H<E8, MergedPath, I7, R>
    ]): HonoBase<E, AddSchemaIfHasResponse<MergeTypedResponse<R> | MergeMiddlewareResponse<M1> | MergeMiddlewareResponse<M2> | MergeMiddlewareResponse<M3> | MergeMiddlewareResponse<M4> | MergeMiddlewareResponse<M5> | MergeMiddlewareResponse<M6>, S, M, P, I7, BasePath>, BasePath, MergePath<BasePath, P>>;
    <P extends string = CurrentPath, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, I5 extends Input = I & I2 & I3 & I4, I6 extends Input = I & I2 & I3 & I4 & I5, I7 extends Input = I & I2 & I3 & I4 & I5 & I6, I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7, I9 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>, E10 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>, M1 extends H<E2, P, I> = H<E2, P, I>, M2 extends H<E3, P, I2> = H<E3, P, I2>, M3 extends H<E4, P, I3> = H<E4, P, I3>, M4 extends H<E5, P, I4> = H<E5, P, I4>, M5 extends H<E6, P, I5> = H<E6, P, I5>, M6 extends H<E7, P, I6> = H<E7, P, I6>, M7 extends H<E8, P, I7> = H<E8, P, I7>, M8 extends H<E9, P, I8> = H<E9, P, I8>>(...handlers: [
        H<E2, P, I> & M1,
        H<E3, P, I2> & M2,
        H<E4, P, I3> & M3,
        H<E5, P, I4> & M4,
        H<E6, P, I5> & M5,
        H<E7, P, I6> & M6,
        H<E8, P, I7> & M7,
        H<E9, P, I8> & M8,
        H<E10, P, I9, R>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10]>, S & ToSchema<M, P, I9, MergeTypedResponse<R> | MergeMiddlewareResponse<M1> | MergeMiddlewareResponse<M2> | MergeMiddlewareResponse<M3> | MergeMiddlewareResponse<M4> | MergeMiddlewareResponse<M5> | MergeMiddlewareResponse<M6> | MergeMiddlewareResponse<M7> | MergeMiddlewareResponse<M8>>, BasePath, CurrentPath>;
    <P extends string, MergedPath extends MergePath<BasePath, P>, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, I5 extends Input = I & I2 & I3 & I4, I6 extends Input = I & I2 & I3 & I4 & I5, I7 extends Input = I & I2 & I3 & I4 & I5 & I6, I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>, M1 extends H<E2, MergedPath, I> = H<E2, MergedPath, I>, M2 extends H<E3, MergedPath, I2> = H<E3, MergedPath, I2>, M3 extends H<E4, MergedPath, I3> = H<E4, MergedPath, I3>, M4 extends H<E5, MergedPath, I4> = H<E5, MergedPath, I4>, M5 extends H<E6, MergedPath, I5> = H<E6, MergedPath, I5>, M6 extends H<E7, MergedPath, I6> = H<E7, MergedPath, I6>, M7 extends H<E8, MergedPath, I7> = H<E8, MergedPath, I7>>(path: P, ...handlers: [
        H<E2, MergedPath, I> & M1,
        H<E3, MergedPath, I2> & M2,
        H<E4, MergedPath, I3> & M3,
        H<E5, MergedPath, I4> & M4,
        H<E6, MergedPath, I5> & M5,
        H<E7, MergedPath, I6> & M6,
        H<E8, MergedPath, I7> & M7,
        H<E9, MergedPath, I8, R>
    ]): HonoBase<E, AddSchemaIfHasResponse<MergeTypedResponse<R> | MergeMiddlewareResponse<M1> | MergeMiddlewareResponse<M2> | MergeMiddlewareResponse<M3> | MergeMiddlewareResponse<M4> | MergeMiddlewareResponse<M5> | MergeMiddlewareResponse<M6> | MergeMiddlewareResponse<M7>, S, M, P, I8, BasePath>, BasePath, MergePath<BasePath, P>>;
    <P extends string = CurrentPath, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, I5 extends Input = I & I2 & I3 & I4, I6 extends Input = I & I2 & I3 & I4 & I5, I7 extends Input = I & I2 & I3 & I4 & I5 & I6, I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7, I9 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8, I10 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8 & I9, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>, E10 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>, E11 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10]>, M1 extends H<E2, P, I> = H<E2, P, I>, M2 extends H<E3, P, I2> = H<E3, P, I2>, M3 extends H<E4, P, I3> = H<E4, P, I3>, M4 extends H<E5, P, I4> = H<E5, P, I4>, M5 extends H<E6, P, I5> = H<E6, P, I5>, M6 extends H<E7, P, I6> = H<E7, P, I6>, M7 extends H<E8, P, I7> = H<E8, P, I7>, M8 extends H<E9, P, I8> = H<E9, P, I8>, M9 extends H<E10, P, I9> = H<E10, P, I9>>(...handlers: [
        H<E2, P, I> & M1,
        H<E3, P, I2> & M2,
        H<E4, P, I3> & M3,
        H<E5, P, I4> & M4,
        H<E6, P, I5> & M5,
        H<E7, P, I6> & M6,
        H<E8, P, I7> & M7,
        H<E9, P, I8> & M8,
        H<E10, P, I9> & M9,
        H<E11, P, I10, R>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10, E11]>, S & ToSchema<M, P, I10, MergeTypedResponse<R> | MergeMiddlewareResponse<M1> | MergeMiddlewareResponse<M2> | MergeMiddlewareResponse<M3> | MergeMiddlewareResponse<M4> | MergeMiddlewareResponse<M5> | MergeMiddlewareResponse<M6> | MergeMiddlewareResponse<M7> | MergeMiddlewareResponse<M8> | MergeMiddlewareResponse<M9>>, BasePath, CurrentPath>;
    <P extends string, MergedPath extends MergePath<BasePath, P>, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, I5 extends Input = I & I2 & I3 & I4, I6 extends Input = I & I2 & I3 & I4 & I5, I7 extends Input = I & I2 & I3 & I4 & I5 & I6, I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7, I9 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>, E10 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>, M1 extends H<E2, MergedPath, I> = H<E2, MergedPath, I>, M2 extends H<E3, MergedPath, I2> = H<E3, MergedPath, I2>, M3 extends H<E4, MergedPath, I3> = H<E4, MergedPath, I3>, M4 extends H<E5, MergedPath, I4> = H<E5, MergedPath, I4>, M5 extends H<E6, MergedPath, I5> = H<E6, MergedPath, I5>, M6 extends H<E7, MergedPath, I6> = H<E7, MergedPath, I6>, M7 extends H<E8, MergedPath, I7> = H<E8, MergedPath, I7>, M8 extends H<E9, MergedPath, I8> = H<E9, MergedPath, I8>>(path: P, ...handlers: [
        H<E2, MergedPath, I> & M1,
        H<E3, MergedPath, I2> & M2,
        H<E4, MergedPath, I3> & M3,
        H<E5, MergedPath, I4> & M4,
        H<E6, MergedPath, I5> & M5,
        H<E7, MergedPath, I6> & M6,
        H<E8, MergedPath, I7> & M7,
        H<E9, MergedPath, I8> & M8,
        H<E10, MergedPath, I9, R>
    ]): HonoBase<E, AddSchemaIfHasResponse<MergeTypedResponse<R> | MergeMiddlewareResponse<M1> | MergeMiddlewareResponse<M2> | MergeMiddlewareResponse<M3> | MergeMiddlewareResponse<M4> | MergeMiddlewareResponse<M5> | MergeMiddlewareResponse<M6> | MergeMiddlewareResponse<M7> | MergeMiddlewareResponse<M8>, S, M, P, I9, BasePath>, BasePath, MergePath<BasePath, P>>;
    <P extends string, MergedPath extends MergePath<BasePath, P>, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, I5 extends Input = I & I2 & I3 & I4, I6 extends Input = I & I2 & I3 & I4 & I5, I7 extends Input = I & I2 & I3 & I4 & I5 & I6, I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7, I9 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8, I10 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8 & I9, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>, E10 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>, E11 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10]>, M1 extends H<E2, MergedPath, I> = H<E2, MergedPath, I>, M2 extends H<E3, MergedPath, I2> = H<E3, MergedPath, I2>, M3 extends H<E4, MergedPath, I3> = H<E4, MergedPath, I3>, M4 extends H<E5, MergedPath, I4> = H<E5, MergedPath, I4>, M5 extends H<E6, MergedPath, I5> = H<E6, MergedPath, I5>, M6 extends H<E7, MergedPath, I6> = H<E7, MergedPath, I6>, M7 extends H<E8, MergedPath, I7> = H<E8, MergedPath, I7>, M8 extends H<E9, MergedPath, I8> = H<E9, MergedPath, I8>, M9 extends H<E10, MergedPath, I9> = H<E10, MergedPath, I9>>(path: P, ...handlers: [
        H<E2, MergedPath, I> & M1,
        H<E3, MergedPath, I2> & M2,
        H<E4, MergedPath, I3> & M3,
        H<E5, MergedPath, I4> & M4,
        H<E6, MergedPath, I5> & M5,
        H<E7, MergedPath, I6> & M6,
        H<E8, MergedPath, I7> & M7,
        H<E9, MergedPath, I8> & M8,
        H<E10, MergedPath, I9> & M9,
        H<E11, MergedPath, I10, R>
    ]): HonoBase<E, AddSchemaIfHasResponse<MergeTypedResponse<R> | MergeMiddlewareResponse<M1> | MergeMiddlewareResponse<M2> | MergeMiddlewareResponse<M3> | MergeMiddlewareResponse<M4> | MergeMiddlewareResponse<M5> | MergeMiddlewareResponse<M6> | MergeMiddlewareResponse<M7> | MergeMiddlewareResponse<M8> | MergeMiddlewareResponse<M9>, S, M, P, I10, BasePath>, BasePath, MergePath<BasePath, P>>;
    <P extends string = CurrentPath, I extends Input = BlankInput, R extends HandlerResponse<any> = any>(...handlers: H<E, P, I, R>[]): HonoBase<E, S & ToSchema<M, P, I, MergeTypedResponse<R>>, BasePath, CurrentPath>;
    <P extends string, I extends Input = BlankInput, R extends HandlerResponse<any> = any>(path: P, ...handlers: [H<E, MergePath<BasePath, P>, I, R>, ...H<E, MergePath<BasePath, P>, I, R>[]]): HonoBase<E, S & ToSchema<M, MergePath<BasePath, P>, I, MergeTypedResponse<R>>, BasePath, MergePath<BasePath, P>>;
    <P extends string, R extends HandlerResponse<any> = any, I extends Input = BlankInput>(path: P): HonoBase<E, S & ToSchema<M, MergePath<BasePath, P>, I, MergeTypedResponse<R>>, BasePath, MergePath<BasePath, P>>;
}
export interface MiddlewareHandlerInterface<E extends Env = Env, S extends Schema = BlankSchema, BasePath extends string = '/'> {
    <E2 extends Env = E>(...handlers: MiddlewareHandler<E2, MergePath<BasePath, '*'>>[]): HonoBase<IntersectNonAnyTypes<[E, E2]>, S, BasePath, MergePath<BasePath, '*'>>;
    <E2 extends Env = E>(handler: MiddlewareHandler<E2, MergePath<BasePath, '*'>>): HonoBase<IntersectNonAnyTypes<[E, E2]>, S, BasePath, MergePath<BasePath, '*'>>;
    <E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, P extends string = MergePath<BasePath, '*'>>(...handlers: [MiddlewareHandler<E2, P>, MiddlewareHandler<E3, P>]): HonoBase<IntersectNonAnyTypes<[E, E2, E3]>, S, BasePath, P>;
    <P extends string, MergedPath extends MergePath<BasePath, P>, E2 extends Env = E>(path: P, handler: MiddlewareHandler<E2, MergedPath, any, any>): HonoBase<IntersectNonAnyTypes<[E, E2]>, S, BasePath, MergedPath>;
    <E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, P extends string = MergePath<BasePath, '*'>>(...handlers: [
        MiddlewareHandler<E2, P, any, any>,
        MiddlewareHandler<E3, P, any, any>,
        MiddlewareHandler<E4, P, any, any>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4]>, S, BasePath, P>;
    <P extends string, MergedPath extends MergePath<BasePath, P>, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>>(path: P, ...handlers: [MiddlewareHandler<E2, P>, MiddlewareHandler<E3, P>]): HonoBase<IntersectNonAnyTypes<[E, E2, E3]>, S, BasePath, MergedPath>;
    <E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, P extends string = MergePath<BasePath, '*'>>(...handlers: [
        MiddlewareHandler<E2, P>,
        MiddlewareHandler<E3, P>,
        MiddlewareHandler<E4, P>,
        MiddlewareHandler<E5, P>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, S, BasePath, P>;
    <P extends string, MergedPath extends MergePath<BasePath, P>, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>>(path: P, ...handlers: [MiddlewareHandler<E2, P>, MiddlewareHandler<E3, P>, MiddlewareHandler<E4, P>]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4]>, S, BasePath, MergedPath>;
    <E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, P extends string = MergePath<BasePath, '*'>>(...handlers: [
        MiddlewareHandler<E2, P>,
        MiddlewareHandler<E3, P>,
        MiddlewareHandler<E4, P>,
        MiddlewareHandler<E5, P>,
        MiddlewareHandler<E6, P>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, S, BasePath, P>;
    <P extends string, MergedPath extends MergePath<BasePath, P>, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>>(path: P, ...handlers: [
        MiddlewareHandler<E2, P>,
        MiddlewareHandler<E3, P>,
        MiddlewareHandler<E4, P>,
        MiddlewareHandler<E5, P>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, S, BasePath, MergedPath>;
    <E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, P extends string = MergePath<BasePath, '*'>>(...handlers: [
        MiddlewareHandler<E2, P>,
        MiddlewareHandler<E3, P>,
        MiddlewareHandler<E4, P>,
        MiddlewareHandler<E5, P>,
        MiddlewareHandler<E6, P>,
        MiddlewareHandler<E7, P>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>, S, BasePath, P>;
    <P extends string, MergedPath extends MergePath<BasePath, P>, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>>(path: P, ...handlers: [
        MiddlewareHandler<E2, P>,
        MiddlewareHandler<E3, P>,
        MiddlewareHandler<E4, P>,
        MiddlewareHandler<E5, P>,
        MiddlewareHandler<E6, P>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, S, BasePath, MergedPath>;
    <E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>, P extends string = MergePath<BasePath, '*'>>(...handlers: [
        MiddlewareHandler<E2, P>,
        MiddlewareHandler<E3, P>,
        MiddlewareHandler<E4, P>,
        MiddlewareHandler<E5, P>,
        MiddlewareHandler<E6, P>,
        MiddlewareHandler<E7, P>,
        MiddlewareHandler<E8, P>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>, S, BasePath, P>;
    <P extends string, MergedPath extends MergePath<BasePath, P>, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>>(path: P, ...handlers: [
        MiddlewareHandler<E2, P>,
        MiddlewareHandler<E3, P>,
        MiddlewareHandler<E4, P>,
        MiddlewareHandler<E5, P>,
        MiddlewareHandler<E6, P>,
        MiddlewareHandler<E7, P>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>, S, BasePath, MergedPath>;
    <E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>, P extends string = MergePath<BasePath, '*'>>(...handlers: [
        MiddlewareHandler<E2, P>,
        MiddlewareHandler<E3, P>,
        MiddlewareHandler<E4, P>,
        MiddlewareHandler<E5, P>,
        MiddlewareHandler<E6, P>,
        MiddlewareHandler<E7, P>,
        MiddlewareHandler<E8, P>,
        MiddlewareHandler<E9, P>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>, S, BasePath, P>;
    <P extends string, MergedPath extends MergePath<BasePath, P>, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>>(path: P, ...handlers: [
        MiddlewareHandler<E2, P>,
        MiddlewareHandler<E3, P>,
        MiddlewareHandler<E4, P>,
        MiddlewareHandler<E5, P>,
        MiddlewareHandler<E6, P>,
        MiddlewareHandler<E7, P>,
        MiddlewareHandler<E8, P>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>, S, BasePath, MergedPath>;
    <E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>, E10 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>, P extends string = MergePath<BasePath, '*'>>(...handlers: [
        MiddlewareHandler<E2, P>,
        MiddlewareHandler<E3, P>,
        MiddlewareHandler<E4, P>,
        MiddlewareHandler<E5, P>,
        MiddlewareHandler<E6, P>,
        MiddlewareHandler<E7, P>,
        MiddlewareHandler<E8, P>,
        MiddlewareHandler<E9, P>,
        MiddlewareHandler<E10, P>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10]>, S, BasePath, P>;
    <P extends string, MergedPath extends MergePath<BasePath, P>, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>>(path: P, ...handlers: [
        MiddlewareHandler<E2, P>,
        MiddlewareHandler<E3, P>,
        MiddlewareHandler<E4, P>,
        MiddlewareHandler<E5, P>,
        MiddlewareHandler<E6, P>,
        MiddlewareHandler<E7, P>,
        MiddlewareHandler<E8, P>,
        MiddlewareHandler<E9, P>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>, S, BasePath, MergedPath>;
    <E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>, E10 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>, E11 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10]>, P extends string = MergePath<BasePath, '*'>>(...handlers: [
        MiddlewareHandler<E2, P>,
        MiddlewareHandler<E3, P>,
        MiddlewareHandler<E4, P>,
        MiddlewareHandler<E5, P>,
        MiddlewareHandler<E6, P>,
        MiddlewareHandler<E7, P>,
        MiddlewareHandler<E8, P>,
        MiddlewareHandler<E9, P>,
        MiddlewareHandler<E10, P>,
        MiddlewareHandler<E11, P>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10, E11]>, S, BasePath, P>;
    <P extends string, MergedPath extends MergePath<BasePath, P>, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>, E10 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>>(path: P, ...handlers: [
        MiddlewareHandler<E2, P>,
        MiddlewareHandler<E3, P>,
        MiddlewareHandler<E4, P>,
        MiddlewareHandler<E5, P>,
        MiddlewareHandler<E6, P>,
        MiddlewareHandler<E7, P>,
        MiddlewareHandler<E8, P>,
        MiddlewareHandler<E9, P>,
        MiddlewareHandler<E10, P>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10]>, S, BasePath, MergedPath>;
    <P extends string, E2 extends Env = E>(path: P, ...handlers: MiddlewareHandler<E2, MergePath<BasePath, P>>[]): HonoBase<E, S, BasePath, MergePath<BasePath, P>>;
}
export interface OnHandlerInterface<E extends Env = Env, S extends Schema = BlankSchema, BasePath extends string = '/'> {
    <M extends string, P extends string, MergedPath extends MergePath<BasePath, P>, R extends HandlerResponse<any> = any, I extends Input = BlankInput, E2 extends Env = E>(method: M, path: P, handler: H<E2, MergedPath, I, R>): HonoBase<IntersectNonAnyTypes<[E, E2]>, S & ToSchema<M, MergePath<BasePath, P>, I, MergeTypedResponse<R>>, BasePath, MergePath<BasePath, P>>;
    <M extends string, P extends string, MergedPath extends MergePath<BasePath, P>, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>>(method: M, path: P, ...handlers: [H<E2, MergedPath, I>, H<E3, MergedPath, I2, R>]): HonoBase<IntersectNonAnyTypes<[E, E2, E3]>, S & ToSchema<M, MergePath<BasePath, P>, I2, MergeTypedResponse<R>>, BasePath, MergePath<BasePath, P>>;
    <M extends string, P extends string, MergedPath extends MergePath<BasePath, P>, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, I3 extends Input = I & I2, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>>(method: M, path: P, ...handlers: [H<E2, MergedPath, I>, H<E3, MergedPath, I2>, H<E4, MergedPath, I3, R>]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4]>, S & ToSchema<M, MergePath<BasePath, P>, I3, MergeTypedResponse<R>>, BasePath, MergePath<BasePath, P>>;
    <M extends string, P extends string, MergedPath extends MergePath<BasePath, P>, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>>(method: M, path: P, ...handlers: [
        H<E2, MergedPath, I>,
        H<E3, MergedPath, I2>,
        H<E4, MergedPath, I3>,
        H<E5, MergedPath, I4, R>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, S & ToSchema<M, MergePath<BasePath, P>, I4, MergeTypedResponse<R>>, BasePath, MergePath<BasePath, P>>;
    <M extends string, P extends string, MergedPath extends MergePath<BasePath, P>, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, I5 extends Input = I & I2 & I3 & I4, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>>(method: M, path: P, ...handlers: [
        H<E2, MergedPath, I>,
        H<E3, MergedPath, I2>,
        H<E4, MergedPath, I3>,
        H<E5, MergedPath, I4>,
        H<E6, MergedPath, I5, R>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, S & ToSchema<M, MergePath<BasePath, P>, I5, MergeTypedResponse<R>>, BasePath, MergePath<BasePath, P>>;
    <M extends string, P extends string, MergedPath extends MergePath<BasePath, P>, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, I5 extends Input = I & I2 & I3 & I4, I6 extends Input = I & I2 & I3 & I4 & I5, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>>(method: M, path: P, ...handlers: [
        H<E2, MergedPath, I>,
        H<E3, MergedPath, I2>,
        H<E4, MergedPath, I3>,
        H<E5, MergedPath, I4>,
        H<E6, MergedPath, I5>,
        H<E7, MergedPath, I6, R>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>, S & ToSchema<M, MergePath<BasePath, P>, I6, MergeTypedResponse<R>>, BasePath, MergePath<BasePath, P>>;
    <M extends string, P extends string, MergedPath extends MergePath<BasePath, P>, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, I5 extends Input = I & I2 & I3 & I4, I6 extends Input = I & I2 & I3 & I4 & I5, I7 extends Input = I & I2 & I3 & I4 & I5 & I6, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>>(method: M, path: P, ...handlers: [
        H<E2, MergedPath, I>,
        H<E3, MergedPath, I2>,
        H<E4, MergedPath, I3>,
        H<E5, MergedPath, I4>,
        H<E6, MergedPath, I5>,
        H<E7, MergedPath, I6>,
        H<E8, MergedPath, I7, R>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>, S & ToSchema<M, MergePath<BasePath, P>, I7, MergeTypedResponse<R>>, BasePath, MergePath<BasePath, P>>;
    <M extends string, P extends string, MergedPath extends MergePath<BasePath, P>, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, I5 extends Input = I & I2 & I3 & I4, I6 extends Input = I & I2 & I3 & I4 & I5, I7 extends Input = I & I2 & I3 & I4 & I5 & I6, I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>>(method: M, path: P, ...handlers: [
        H<E2, MergedPath, I>,
        H<E3, MergedPath, I2>,
        H<E4, MergedPath, I3>,
        H<E5, MergedPath, I4>,
        H<E6, MergedPath, I5>,
        H<E7, MergedPath, I6>,
        H<E8, MergedPath, I7>,
        H<E9, MergedPath, I8, R>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>, S & ToSchema<M, MergePath<BasePath, P>, I8, MergeTypedResponse<R>>, BasePath, MergePath<BasePath, P>>;
    <M extends string, P extends string, MergedPath extends MergePath<BasePath, P>, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, I5 extends Input = I & I2 & I3 & I4, I6 extends Input = I & I2 & I3 & I4 & I5, I7 extends Input = I & I2 & I3 & I4 & I5 & I6, I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7, I9 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>, E10 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>>(method: M, path: P, ...handlers: [
        H<E2, MergedPath, I>,
        H<E3, MergedPath, I2>,
        H<E4, MergedPath, I3>,
        H<E5, MergedPath, I4>,
        H<E6, MergedPath, I5>,
        H<E7, MergedPath, I6>,
        H<E8, MergedPath, I7>,
        H<E9, MergedPath, I8>,
        H<E10, MergedPath, I9, R>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10]>, S & ToSchema<M, MergePath<BasePath, P>, I9, MergeTypedResponse<R>>, BasePath, MergePath<BasePath, P>>;
    <M extends string, P extends string, MergedPath extends MergePath<BasePath, P>, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, I5 extends Input = I & I2 & I3 & I4, I6 extends Input = I & I2 & I3 & I4 & I5, I7 extends Input = I & I2 & I3 & I4 & I5 & I6, I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7, I9 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8, I10 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8 & I9, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>, E10 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>, E11 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10]>>(method: M, path: P, ...handlers: [
        H<E2, MergedPath, I>,
        H<E3, MergedPath, I2>,
        H<E4, MergedPath, I3>,
        H<E5, MergedPath, I4>,
        H<E6, MergedPath, I5>,
        H<E7, MergedPath, I6>,
        H<E8, MergedPath, I7>,
        H<E9, MergedPath, I8>,
        H<E10, MergedPath, I9>,
        H<E11, MergedPath, I10, R>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10, E11]>, S & ToSchema<M, MergePath<BasePath, P>, I10, MergeTypedResponse<HandlerResponse<any>>>, BasePath, MergePath<BasePath, P>>;
    <M extends string, P extends string, R extends HandlerResponse<any> = any, I extends Input = BlankInput>(method: M, path: P, ...handlers: [H<E, MergePath<BasePath, P>, I, R>, ...H<E, MergePath<BasePath, P>, I, R>[]]): HonoBase<E, S & ToSchema<M, MergePath<BasePath, P>, I, MergeTypedResponse<R>>, BasePath, MergePath<BasePath, P>>;
    <M extends string, P extends string, MergedPath extends MergePath<BasePath, P>, R extends HandlerResponse<any> = any, I extends Input = BlankInput, E2 extends Env = E>(methods: M[], path: P, handler: H<E2, MergedPath, I, R>): HonoBase<IntersectNonAnyTypes<[E, E2]>, S & ToSchema<M, MergePath<BasePath, P>, I, MergeTypedResponse<R>>, BasePath, MergePath<BasePath, P>>;
    <M extends string, P extends string, MergedPath extends MergePath<BasePath, P>, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>>(methods: M[], path: P, ...handlers: [H<E2, MergedPath, I>, H<E3, MergedPath, I2, R>]): HonoBase<IntersectNonAnyTypes<[E, E2, E3]>, S & ToSchema<M, MergePath<BasePath, P>, I2, MergeTypedResponse<R>>, BasePath, MergePath<BasePath, P>>;
    <M extends string, P extends string, MergedPath extends MergePath<BasePath, P>, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, I3 extends Input = I & I2, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>>(methods: M[], path: P, ...handlers: [H<E2, MergedPath, I>, H<E3, MergedPath, I2>, H<E4, MergedPath, I3, R>]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4]>, S & ToSchema<M, MergePath<BasePath, P>, I3, MergeTypedResponse<R>>, BasePath, MergePath<BasePath, P>>;
    <M extends string, P extends string, MergedPath extends MergePath<BasePath, P>, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>>(methods: M[], path: P, ...handlers: [
        H<E2, MergedPath, I>,
        H<E3, MergedPath, I2>,
        H<E4, MergedPath, I3>,
        H<E5, MergedPath, I4, R>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, S & ToSchema<M, MergePath<BasePath, P>, I4, MergeTypedResponse<R>>, BasePath, MergePath<BasePath, P>>;
    <M extends string, P extends string, MergedPath extends MergePath<BasePath, P>, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, I5 extends Input = I & I2 & I3 & I4, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>>(methods: M[], path: P, ...handlers: [
        H<E2, MergedPath, I>,
        H<E3, MergedPath, I2>,
        H<E4, MergedPath, I3>,
        H<E5, MergedPath, I4>,
        H<E6, MergedPath, I5, R>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, S & ToSchema<M, MergePath<BasePath, P>, I5, MergeTypedResponse<R>>, BasePath, MergePath<BasePath, P>>;
    <M extends string, P extends string, MergedPath extends MergePath<BasePath, P>, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, I5 extends Input = I & I2 & I3 & I4, I6 extends Input = I & I2 & I3 & I4 & I5, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>>(methods: M[], path: P, ...handlers: [
        H<E2, MergedPath, I>,
        H<E3, MergedPath, I2>,
        H<E4, MergedPath, I3>,
        H<E5, MergedPath, I4>,
        H<E6, MergedPath, I5>,
        H<E7, MergedPath, I6, R>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>, S & ToSchema<M, MergePath<BasePath, P>, I6, MergeTypedResponse<R>>, BasePath, MergePath<BasePath, P>>;
    <M extends string, P extends string, MergedPath extends MergePath<BasePath, P>, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, I5 extends Input = I & I2 & I3 & I4, I6 extends Input = I & I2 & I3 & I4 & I5, I7 extends Input = I & I2 & I3 & I4 & I5 & I6, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>>(methods: M[], path: P, ...handlers: [
        H<E2, MergedPath, I>,
        H<E3, MergedPath, I2>,
        H<E4, MergedPath, I3>,
        H<E5, MergedPath, I4>,
        H<E6, MergedPath, I5>,
        H<E7, MergedPath, I6>,
        H<E8, MergedPath, I7, R>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>, S & ToSchema<M, MergePath<BasePath, P>, I7, MergeTypedResponse<R>>, BasePath, MergePath<BasePath, P>>;
    <M extends string, P extends string, MergedPath extends MergePath<BasePath, P>, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, I5 extends Input = I & I2 & I3 & I4, I6 extends Input = I & I2 & I3 & I4 & I5, I7 extends Input = I & I2 & I3 & I4 & I5 & I6, I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>>(methods: M[], path: P, ...handlers: [
        H<E2, MergedPath, I>,
        H<E3, MergedPath, I2>,
        H<E4, MergedPath, I3>,
        H<E5, MergedPath, I4>,
        H<E6, MergedPath, I5>,
        H<E7, MergedPath, I6>,
        H<E8, MergedPath, I7>,
        H<E9, MergedPath, I8, R>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>, S & ToSchema<M, MergePath<BasePath, P>, I8, MergeTypedResponse<R>>, BasePath, MergePath<BasePath, P>>;
    <M extends string, P extends string, MergedPath extends MergePath<BasePath, P>, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, I5 extends Input = I & I2 & I3 & I4, I6 extends Input = I & I2 & I3 & I4 & I5, I7 extends Input = I & I2 & I3 & I4 & I5 & I6, I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7, I9 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>, E10 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>>(methods: M[], path: P, ...handlers: [
        H<E2, MergedPath, I>,
        H<E3, MergedPath, I2>,
        H<E4, MergedPath, I3>,
        H<E5, MergedPath, I4>,
        H<E6, MergedPath, I5>,
        H<E7, MergedPath, I6>,
        H<E8, MergedPath, I7>,
        H<E9, MergedPath, I8>,
        H<E10, MergedPath, I9, R>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10]>, S & ToSchema<M, MergePath<BasePath, P>, I9, MergeTypedResponse<HandlerResponse<any>>>, BasePath, MergePath<BasePath, P>>;
    <M extends string, P extends string, MergedPath extends MergePath<BasePath, P>, R extends HandlerResponse<any> = any, I extends Input = BlankInput, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, I5 extends Input = I & I2 & I3 & I4, I6 extends Input = I & I2 & I3 & I4 & I5, I7 extends Input = I & I2 & I3 & I4 & I5 & I6, I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7, I9 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8, I10 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8 & I9, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>, E10 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>, E11 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10]>>(methods: M[], path: P, ...handlers: [
        H<E2, MergedPath, I>,
        H<E3, MergedPath, I2>,
        H<E4, MergedPath, I3>,
        H<E5, MergedPath, I4>,
        H<E6, MergedPath, I5>,
        H<E7, MergedPath, I6>,
        H<E8, MergedPath, I7>,
        H<E9, MergedPath, I8>,
        H<E10, MergedPath, I9>,
        H<E11, MergedPath, I10, R>
    ]): HonoBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10, E11]>, S & ToSchema<M, MergePath<BasePath, P>, I10, MergeTypedResponse<HandlerResponse<any>>>, BasePath, MergePath<BasePath, P>>;
    <M extends string, P extends string, R extends HandlerResponse<any> = any, I extends Input = BlankInput>(methods: M[], path: P, ...handlers: [H<E, MergePath<BasePath, P>, I, R>, ...H<E, MergePath<BasePath, P>, I, R>[]]): HonoBase<E, S & ToSchema<M, MergePath<BasePath, P>, I, MergeTypedResponse<R>>, BasePath, MergePath<BasePath, P>>;
    <M extends string, const Ps extends string[], I extends Input = BlankInput, R extends HandlerResponse<any> = any, E2 extends Env = E>(methods: M | M[], paths: Ps, ...handlers: H<E2, MergePath<BasePath, Ps[number]>, I, R>[]): HonoBase<E, S & ToSchema<M, MergePath<BasePath, Ps[number]>, I, MergeTypedResponse<R>>, BasePath, Ps extends [...string[], infer LastPath extends string] ? MergePath<BasePath, LastPath> : never>;
}
type ToSchemaOutput<RorO, I extends Input | Input['in']> = RorO extends TypedResponse<infer T, infer U, infer F> ? {
    output: unknown extends T ? {} : T;
    outputFormat: I extends {
        outputFormat: string;
    } ? I['outputFormat'] : F;
    status: U;
} : {
    output: unknown extends RorO ? {} : RorO;
    outputFormat: unknown extends RorO ? 'json' : I extends {
        outputFormat: string;
    } ? I['outputFormat'] : 'json';
    status: StatusCode;
};
export type ToSchema<M extends string, P extends string, I extends Input | Input['in'], RorO> = IsAny<RorO> extends true ? {
    [K in P]: {
        [K2 in M as AddDollar<K2>]: {
            input: AddParam<ExtractInput<I>, P>;
            output: {};
            outputFormat: ResponseFormat;
            status: StatusCode;
        };
    };
} : [RorO] extends [never] ? {} : [RorO] extends [Promise<void>] ? {} : {
    [K in P]: {
        [K2 in M as AddDollar<K2>]: Simplify<{
            input: AddParam<ExtractInput<I>, P>;
        } & ToSchemaOutput<RorO, I>>;
    };
};
export type Schema = {
    [Path: string]: {
        [Method: `$${Lowercase<string>}`]: Endpoint;
    };
};
type AddSchemaIfHasResponse<Merged, S extends Schema, M extends string, P extends string, I extends Input | Input['in'], BasePath extends string> = [Merged] extends [Promise<void>] ? S : S & ToSchema<M, MergePath<BasePath, P>, I, Merged>;
export type Endpoint = {
    input: any;
    output: any;
    outputFormat: ResponseFormat;
    status: StatusCode;
};
type ExtractParams<Path extends string> = string extends Path ? Record<string, string> : Path extends `${infer _Start}:${infer Param}/${infer Rest}` ? {
    [K in Param | keyof ExtractParams<`/${Rest}`>]: string;
} : Path extends `${infer _Start}:${infer Param}` ? {
    [K in Param]: string;
} : never;
type FlattenIfIntersect<T> = T extends infer O ? {
    [K in keyof O]: O[K];
} : never;
export type MergeSchemaPath<OrigSchema extends Schema, SubPath extends string> = {
    [P in keyof OrigSchema as MergePath<SubPath, P & string>]: [OrigSchema[P]] extends [
        Record<string, Endpoint>
    ] ? {
        [M in keyof OrigSchema[P]]: MergeEndpointParamsWithPath<OrigSchema[P][M], SubPath>;
    } : never;
};
type MergeEndpointParamsWithPath<T extends Endpoint, SubPath extends string> = T extends unknown ? {
    input: T['input'] extends {
        param: infer _;
    } ? ExtractParams<SubPath> extends never ? T['input'] : FlattenIfIntersect<T['input'] & {
        param: {
            [K in keyof ExtractParams<SubPath> as K extends `${infer Prefix}{${infer _}}` ? Prefix : K]: string;
        };
    }> : RemoveBlankRecord<ExtractParams<SubPath>> extends never ? T['input'] : T['input'] & {
        param: {
            [K in keyof ExtractParams<SubPath> as K extends `${infer Prefix}{${infer _}}` ? Prefix : K]: string;
        };
    };
    output: T['output'];
    outputFormat: T['outputFormat'];
    status: T['status'];
} : never;
export type AddParam<I, P extends string> = ParamKeys<P> extends never ? I : I extends {
    param: infer _;
} ? I : I & {
    param: UnionToIntersection<ParamKeyToRecord<ParamKeys<P>>>;
};
type AddDollar<T extends string> = `$${Lowercase<T>}`;
export type MergePath<A extends string, B extends string> = B extends '' ? MergePath<A, '/'> : A extends '' ? B : A extends '/' ? B : A extends `${infer P}/` ? B extends `/${infer Q}` ? `${P}/${Q}` : `${P}/${B}` : B extends `/${infer Q}` ? Q extends '' ? A : `${A}/${Q}` : `${A}/${B}`;
export type KnownResponseFormat = 'json' | 'text' | 'redirect';
export type ResponseFormat = KnownResponseFormat | string;
export type TypedResponse<T = unknown, U extends StatusCode = StatusCode, F extends ResponseFormat = T extends string ? 'text' : T extends JSONValue ? 'json' : ResponseFormat> = {
    _data: T;
    _status: U;
    _format: F;
};
type MergeTypedResponse<T> = T extends Promise<void> ? T : T extends Promise<infer T2> ? T2 extends TypedResponse ? T2 : TypedResponse : T extends TypedResponse ? T : TypedResponse;
type ExtractTypedResponseOnly<T> = T extends TypedResponse ? T : never;
type MergeMiddlewareResponse<T> = T extends (c: any, next: any) => Promise<infer R> ? Exclude<R, void> extends never ? never : Exclude<R, void> extends Response | TypedResponse<any, any, any> ? ExtractTypedResponseOnly<Exclude<R, void>> : never : T extends (c: any, next: any) => infer R ? R extends Response | TypedResponse<any, any, any> ? ExtractTypedResponseOnly<R> : never : never;
export type FormValue = string | Blob;
export type ParsedFormValue = string | File;
export type ValidationTargets<T extends FormValue = ParsedFormValue, P extends string = string> = {
    json: any;
    form: Record<string, T | T[]>;
    query: Record<string, string | string[]>;
    param: Record<P, P extends `${infer _}?` ? string | undefined : string>;
    header: Record<RequestHeader | CustomHeader, string>;
    cookie: Record<string, string>;
};
type ParamKey<Component> = Component extends `:${infer NameWithPattern}` ? NameWithPattern extends `${infer Name}{${infer Rest}` ? Rest extends `${infer _Pattern}?` ? `${Name}?` : Name : NameWithPattern : never;
export type ParamKeys<Path> = Path extends `${infer Component}/${infer Rest}` ? ParamKey<Component> | ParamKeys<Rest> : ParamKey<Path>;
export type ParamKeyToRecord<T extends string> = T extends `${infer R}?` ? Record<R, string | undefined> : {
    [K in T]: string;
};
export type InputToDataByTarget<T extends Input['out'], Target extends keyof ValidationTargets> = T extends {
    [K in Target]: infer R;
} ? R : never;
export type RemoveQuestion<T> = T extends `${infer R}?` ? R : T;
export type ExtractSchema<T> = UnionToIntersection<T extends HonoBase<infer _, infer S, any, any> ? S : never>;
export type ExtractSchemaForStatusCode<T, Status extends number> = {
    [Path in keyof ExtractSchema<T>]: {
        [Method in keyof ExtractSchema<T>[Path]]: Extract<ExtractSchema<T>[Path][Method], {
            status: Status;
        }>;
    };
};
export type ExtractHandlerResponse<T> = T extends (c: any, next: any) => Promise<infer R> ? Exclude<R, void> extends never ? never : Exclude<R, void> extends Response | TypedResponse<any, any, any> ? Exclude<R, void> : never : T extends (c: any, next: any) => infer R ? R extends Response | TypedResponse<any, any, any> ? R : never : never;
type ProcessHead<T> = IfAnyThenEmptyObject<T extends Env ? (Env extends T ? {} : T) : T>;
export type IntersectNonAnyTypes<T extends any[]> = T extends [infer Head, ...infer Rest] ? ProcessHead<Head> & IntersectNonAnyTypes<Rest> : {};
export declare abstract class FetchEventLike {
    abstract readonly request: Request;
    abstract respondWith(promise: Response | Promise<Response>): void;
    abstract passThroughOnException(): void;
    abstract waitUntil(promise: Promise<void>): void;
}
export {};
