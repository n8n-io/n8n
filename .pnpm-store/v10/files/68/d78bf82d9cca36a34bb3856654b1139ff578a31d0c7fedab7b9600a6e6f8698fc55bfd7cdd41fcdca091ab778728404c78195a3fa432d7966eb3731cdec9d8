import {handleClientStreamingCall} from '@grpc/grpc-js';
import {
  CallContext,
  MethodDescriptor,
  ServerMiddleware,
} from 'nice-grpc-common';
import {MethodDefinition} from '../service-definitions';
import {convertMetadataToGrpcJs} from '../utils/convertMetadata';
import {isAsyncIterable} from '../utils/isAsyncIterable';
import {readableToAsyncIterable} from '../utils/readableToAsyncIterable';
import {ClientStreamingMethodImplementation} from './ServiceImplementation';
import {createCallContext} from './createCallContext';
import {createErrorStatusObject} from './createErrorStatusObject';

/** @internal */
export function createClientStreamingMethodHandler<Request, Response>(
  definition: MethodDefinition<unknown, Request, Response, unknown>,
  implementation: ClientStreamingMethodImplementation<Request, Response>,
  middleware?: ServerMiddleware,
): handleClientStreamingCall<Request, Response> {
  const methodDescriptor: MethodDescriptor = {
    path: definition.path,
    requestStream: definition.requestStream,
    responseStream: definition.responseStream,
    options: definition.options,
  };

  async function* clientStreamingMethodHandler(
    request: AsyncIterable<Request>,
    context: CallContext,
  ) {
    if (!isAsyncIterable(request)) {
      throw new Error(
        'A middleware passed invalid request to next(): expected a single message for client streaming method',
      );
    }

    return await implementation(request, context);
  }

  const handler =
    middleware == null
      ? clientStreamingMethodHandler
      : (request: AsyncIterable<Request>, context: CallContext) =>
          middleware(
            {
              method: methodDescriptor,
              requestStream: true,
              request,
              responseStream: false,
              next: clientStreamingMethodHandler,
            },
            context,
          );

  return (call, callback) => {
    const {context, maybeCancel} = createCallContext(call);

    Promise.resolve()
      .then(async () => {
        const iterable = handler(readableToAsyncIterable(call), context);
        const iterator = iterable[Symbol.asyncIterator]();

        try {
          let result = await iterator.next();

          while (true) {
            if (!result.done) {
              result = await iterator.throw(
                new Error(
                  'A middleware yielded a message, but expected to only return a message for client streaming method',
                ),
              );

              continue;
            }

            if (result.value == null) {
              result = await iterator.throw(
                new Error(
                  'A middleware returned void, but expected to return a message for client streaming method',
                ),
              );

              continue;
            }

            return result.value;
          }
        } finally {
          maybeCancel.cancel = undefined;
          context.sendHeader();
        }
      })
      .then(
        res => {
          callback(null, res, convertMetadataToGrpcJs(context.trailer));
        },
        err => {
          callback(
            createErrorStatusObject(
              definition.path,
              err,
              convertMetadataToGrpcJs(context.trailer),
            ),
          );
        },
      );
  };
}
