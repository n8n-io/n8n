import { MethodDescriptor } from '../MethodDescriptor';
import { CallOptions } from './CallOptions';
/**
 * Client middleware.
 *
 * Defined as an async generator function. The most basic no-op middleware looks
 * like this:
 *
 * ```ts
 * import {ClientMiddlewareCall, CallOptions} from 'nice-grpc-common';
 *
 * async function* middleware<Request, Response>(
 *   call: ClientMiddlewareCall<Request, Response>,
 *   options: CallOptions,
 * ) {
 *   return yield* call.next(call.request, options);
 * }
 * ```
 *
 * @template CallOptionsExt Extra call options properties that are consumed by
 *     this middleware.
 * @template RequiredCallOptionsExt Extra call options properties that are
 *     required by this middleware. Must be added by a middleware that is
 *     attached to the client before this middleware.
 */
export type ClientMiddleware<CallOptionsExt = {}, RequiredCallOptionsExt = {}> = <Request, Response>(call: ClientMiddlewareCall<Request, Response, RequiredCallOptionsExt>, options: CallOptions & Partial<CallOptionsExt & RequiredCallOptionsExt>) => AsyncGenerator<Response, Response | void, undefined>;
export type ClientMiddlewareCall<Request, Response, NextCallOptionsExt = {}> = {
    method: MethodDescriptor;
} & ClientMiddlewareCallRequest<Request> & ClientMiddlewareCallResponse<Request, Response, NextCallOptionsExt>;
export type ClientMiddlewareCallRequest<Request> = {
    requestStream: false;
    request: Request;
} | {
    requestStream: true;
    request: AsyncIterable<Request>;
};
export type ClientMiddlewareCallResponse<Request, Response, NextCallOptionsExt> = {
    responseStream: false;
    next(request: Request | AsyncIterable<Request>, options: CallOptions & Partial<NextCallOptionsExt>): AsyncGenerator<never, Response, undefined>;
} | {
    responseStream: true;
    next(request: Request | AsyncIterable<Request>, options: CallOptions & Partial<NextCallOptionsExt>): AsyncGenerator<Response, void, undefined>;
};
