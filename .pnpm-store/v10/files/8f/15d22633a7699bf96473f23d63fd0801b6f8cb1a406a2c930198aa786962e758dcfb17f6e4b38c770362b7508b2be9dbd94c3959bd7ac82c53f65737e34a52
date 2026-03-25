import { MethodDescriptor } from '../MethodDescriptor';
import { CallContext } from './CallContext';
/**
 * Server middleware.
 *
 * Defined as an async generator function. The most basic no-op middleware looks
 * like this:
 *
 * ```ts
 * import {ServerMiddlewareCall, CallContext} from 'nice-grpc-common';
 *
 * async function* middleware<Request, Response>(
 *   call: ServerMiddlewareCall<Request, Response>,
 *   context: CallContext,
 * ) {
 *   return yield* call.next(call.request, context);
 * }
 * ```
 *
 * @template CallContextExt Extra call context properties that are added by this
 *     middleware.
 * @template RequiredCallContextExt Extra call context properties that are
 *     required by this middleware. Must be added by a middleware that is
 *     attached to the server before this middleware.
 */
export type ServerMiddleware<CallContextExt = {}, RequiredCallContextExt = {}> = <Request, Response>(call: ServerMiddlewareCall<Request, Response, CallContextExt & RequiredCallContextExt>, context: CallContext & RequiredCallContextExt) => AsyncGenerator<Response, Response | void, undefined>;
export type ServerMiddlewareCall<Request, Response, NextCallContextExt = {}> = {
    method: MethodDescriptor;
} & ServerMiddlewareCallRequest<Request> & ServerMiddlewareCallResponse<Request, Response, NextCallContextExt>;
export type ServerMiddlewareCallRequest<Request> = {
    requestStream: false;
    request: Request;
} | {
    requestStream: true;
    request: AsyncIterable<Request>;
};
export type ServerMiddlewareCallResponse<Request, Response, NextCallContextExt> = {
    responseStream: false;
    next(request: Request | AsyncIterable<Request>, context: CallContext & NextCallContextExt): AsyncGenerator<never, Response, undefined>;
} | {
    responseStream: true;
    next(request: Request | AsyncIterable<Request>, context: CallContext & NextCallContextExt): AsyncGenerator<Response, void, undefined>;
};
