/**
 * @module
 * Factory Helper for Hono.
 */
import { Hono } from '../../hono';
import type { HonoOptions } from '../../hono-base';
import type { Env, H, HandlerResponse, Input, IntersectNonAnyTypes, MiddlewareHandler } from '../../types';
type InitApp<E extends Env = Env> = (app: Hono<E>) => void;
export interface CreateHandlersInterface<E extends Env, P extends string> {
    <I extends Input = {}, R extends HandlerResponse<any> = any, E2 extends Env = E>(handler1: H<E2, P, I, R>): [H<E2, P, I, R>];
    <I extends Input = {}, I2 extends Input = I, R extends HandlerResponse<any> = any, R2 extends HandlerResponse<any> = any, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>>(handler1: H<E2, P, I, R>, handler2: H<E3, P, I2, R2>): [H<E2, P, I, R>, H<E3, P, I2, R2>];
    <I extends Input = {}, I2 extends Input = I, I3 extends Input = I & I2, R extends HandlerResponse<any> = any, R2 extends HandlerResponse<any> = any, R3 extends HandlerResponse<any> = any, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>>(handler1: H<E2, P, I, R>, handler2: H<E3, P, I2, R2>, handler3: H<E4, P, I3, R3>): [H<E2, P, I, R>, H<E3, P, I2, R2>, H<E4, P, I3, R3>];
    <I extends Input = {}, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, R extends HandlerResponse<any> = any, R2 extends HandlerResponse<any> = any, R3 extends HandlerResponse<any> = any, R4 extends HandlerResponse<any> = any, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>>(handler1: H<E2, P, I, R>, handler2: H<E3, P, I2, R2>, handler3: H<E4, P, I3, R3>, handler4: H<E5, P, I4, R4>): [H<E2, P, I, R>, H<E3, P, I2, R2>, H<E4, P, I3, R3>, H<E5, P, I4, R4>];
    <I extends Input = {}, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, I5 extends Input = I & I2 & I3 & I4, R extends HandlerResponse<any> = any, R2 extends HandlerResponse<any> = any, R3 extends HandlerResponse<any> = any, R4 extends HandlerResponse<any> = any, R5 extends HandlerResponse<any> = any, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>>(handler1: H<E2, P, I, R>, handler2: H<E3, P, I2, R2>, handler3: H<E4, P, I3, R3>, handler4: H<E5, P, I4, R4>, handler5: H<E6, P, I5, R5>): [H<E2, P, I, R>, H<E3, P, I2, R2>, H<E4, P, I3, R3>, H<E5, P, I4, R4>, H<E6, P, I5, R5>];
    <I extends Input = {}, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, I5 extends Input = I & I2 & I3 & I4, I6 extends Input = I & I2 & I3 & I4 & I5, R extends HandlerResponse<any> = any, R2 extends HandlerResponse<any> = any, R3 extends HandlerResponse<any> = any, R4 extends HandlerResponse<any> = any, R5 extends HandlerResponse<any> = any, R6 extends HandlerResponse<any> = any, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>>(handler1: H<E2, P, I, R>, handler2: H<E3, P, I2, R2>, handler3: H<E4, P, I3, R3>, handler4: H<E5, P, I4, R4>, handler5: H<E6, P, I5, R5>, handler6: H<E7, P, I6, R6>): [
        H<E2, P, I, R>,
        H<E3, P, I2, R2>,
        H<E4, P, I3, R3>,
        H<E5, P, I4, R4>,
        H<E6, P, I5, R5>,
        H<E7, P, I6, R6>
    ];
    <I extends Input = {}, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, I5 extends Input = I & I2 & I3 & I4, I6 extends Input = I & I2 & I3 & I4 & I5, I7 extends Input = I & I2 & I3 & I4 & I5 & I6, R extends HandlerResponse<any> = any, R2 extends HandlerResponse<any> = any, R3 extends HandlerResponse<any> = any, R4 extends HandlerResponse<any> = any, R5 extends HandlerResponse<any> = any, R6 extends HandlerResponse<any> = any, R7 extends HandlerResponse<any> = any, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>>(handler1: H<E2, P, I, R>, handler2: H<E3, P, I2, R2>, handler3: H<E4, P, I3, R3>, handler4: H<E5, P, I4, R4>, handler5: H<E6, P, I5, R5>, handler6: H<E7, P, I6, R6>, handler7: H<E8, P, I7, R7>): [
        H<E2, P, I, R>,
        H<E3, P, I2, R2>,
        H<E4, P, I3, R3>,
        H<E5, P, I4, R4>,
        H<E6, P, I5, R5>,
        H<E7, P, I6, R6>,
        H<E8, P, I7, R7>
    ];
    <I extends Input = {}, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, I5 extends Input = I & I2 & I3 & I4, I6 extends Input = I & I2 & I3 & I4 & I5, I7 extends Input = I & I2 & I3 & I4 & I5 & I6, I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7, R extends HandlerResponse<any> = any, R2 extends HandlerResponse<any> = any, R3 extends HandlerResponse<any> = any, R4 extends HandlerResponse<any> = any, R5 extends HandlerResponse<any> = any, R6 extends HandlerResponse<any> = any, R7 extends HandlerResponse<any> = any, R8 extends HandlerResponse<any> = any, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>>(handler1: H<E2, P, I, R>, handler2: H<E3, P, I2, R2>, handler3: H<E4, P, I3, R3>, handler4: H<E5, P, I4, R4>, handler5: H<E6, P, I5, R5>, handler6: H<E7, P, I6, R6>, handler7: H<E8, P, I7, R7>, handler8: H<E9, P, I8, R8>): [
        H<E2, P, I, R>,
        H<E3, P, I2, R2>,
        H<E4, P, I3, R3>,
        H<E5, P, I4, R4>,
        H<E6, P, I5, R5>,
        H<E7, P, I6, R6>,
        H<E8, P, I7, R7>,
        H<E9, P, I8, R8>
    ];
    <I extends Input = {}, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, I5 extends Input = I & I2 & I3 & I4, I6 extends Input = I & I2 & I3 & I4 & I5, I7 extends Input = I & I2 & I3 & I4 & I5 & I6, I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7, I9 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8, R extends HandlerResponse<any> = any, R2 extends HandlerResponse<any> = any, R3 extends HandlerResponse<any> = any, R4 extends HandlerResponse<any> = any, R5 extends HandlerResponse<any> = any, R6 extends HandlerResponse<any> = any, R7 extends HandlerResponse<any> = any, R8 extends HandlerResponse<any> = any, R9 extends HandlerResponse<any> = any, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>, E10 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>>(handler1: H<E2, P, I, R>, handler2: H<E3, P, I2, R2>, handler3: H<E4, P, I3, R3>, handler4: H<E5, P, I4, R4>, handler5: H<E6, P, I5, R5>, handler6: H<E7, P, I6, R6>, handler7: H<E8, P, I7, R7>, handler8: H<E9, P, I8, R8>, handler9: H<E10, P, I9, R9>): [
        H<E2, P, I, R>,
        H<E3, P, I2, R>,
        H<E4, P, I3, R>,
        H<E5, P, I4, R>,
        H<E6, P, I5, R>,
        H<E7, P, I6, R>,
        H<E8, P, I7, R>,
        H<E9, P, I8, R>,
        H<E10, P, I9, R>
    ];
    <I extends Input = {}, I2 extends Input = I, I3 extends Input = I & I2, I4 extends Input = I & I2 & I3, I5 extends Input = I & I2 & I3 & I4, I6 extends Input = I & I2 & I3 & I4 & I5, I7 extends Input = I & I2 & I3 & I4 & I5 & I6, I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7, I9 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8, I10 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8 & I9, R extends HandlerResponse<any> = any, R2 extends HandlerResponse<any> = any, R3 extends HandlerResponse<any> = any, R4 extends HandlerResponse<any> = any, R5 extends HandlerResponse<any> = any, R6 extends HandlerResponse<any> = any, R7 extends HandlerResponse<any> = any, R8 extends HandlerResponse<any> = any, R9 extends HandlerResponse<any> = any, R10 extends HandlerResponse<any> = any, E2 extends Env = E, E3 extends Env = IntersectNonAnyTypes<[E, E2]>, E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>, E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>, E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>, E9 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>, E10 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>, E11 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10]>>(handler1: H<E2, P, I, R>, handler2: H<E3, P, I2, R2>, handler3: H<E4, P, I3, R3>, handler4: H<E5, P, I4, R4>, handler5: H<E6, P, I5, R5>, handler6: H<E7, P, I6, R6>, handler7: H<E8, P, I7, R7>, handler8: H<E9, P, I8, R8>, handler9: H<E10, P, I9, R9>, handler10: H<E11, P, I10, R10>): [
        H<E2, P, I, R>,
        H<E3, P, I2, R2>,
        H<E4, P, I3, R3>,
        H<E5, P, I4, R4>,
        H<E6, P, I5, R5>,
        H<E7, P, I6, R6>,
        H<E8, P, I7, R7>,
        H<E9, P, I8, R8>,
        H<E10, P, I9, R9>,
        H<E11, P, I10, R10>
    ];
}
export declare class Factory<E extends Env = Env, P extends string = string> {
             
    private initApp?;
    constructor(init?: {
        initApp?: InitApp<E>;
        defaultAppOptions?: HonoOptions<E>;
    });
    createApp: (options?: HonoOptions<E>) => Hono<E>;
    createMiddleware: <I extends Input = {}, R extends HandlerResponse<any> | void = void>(middleware: MiddlewareHandler<E, P, I, R extends void ? Response : R>) => MiddlewareHandler<E, P, I, R extends void ? Response : R>;
    createHandlers: CreateHandlersInterface<E, P>;
}
export declare const createFactory: <E extends Env = Env, P extends string = string>(init?: {
    initApp?: InitApp<E>;
    defaultAppOptions?: HonoOptions<E>;
}) => Factory<E, P>;
export declare const createMiddleware: <E extends Env = any, P extends string = string, I extends Input = {}, R extends HandlerResponse<any> | void = void>(middleware: MiddlewareHandler<E, P, I, R extends void ? Response : R>) => MiddlewareHandler<E, P, I, R extends void ? Response : R>;
export {};
