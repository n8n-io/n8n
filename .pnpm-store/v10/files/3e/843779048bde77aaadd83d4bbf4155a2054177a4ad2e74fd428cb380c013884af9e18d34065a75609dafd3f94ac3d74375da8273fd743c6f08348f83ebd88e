import {handleBidiStreamingCall} from '@grpc/grpc-js';
import {isAbortError, waitForEvent} from 'abort-controller-x';
import {
  CallContext,
  MethodDescriptor,
  ServerMiddleware,
} from 'nice-grpc-common';
import {MethodDefinition} from '../service-definitions';
import {convertMetadataToGrpcJs} from '../utils/convertMetadata';
import {isAsyncIterable} from '../utils/isAsyncIterable';
import {readableToAsyncIterable} from '../utils/readableToAsyncIterable';
import {BidiStreamingMethodImplementation} from './ServiceImplementation';
import {createCallContext} from './createCallContext';
import {createErrorStatusObject} from './createErrorStatusObject';

/** @internal */
export function createBidiStreamingMethodHandler<Request, Response>(
  definition: MethodDefinition<unknown, Request, Response, unknown>,
  implementation: BidiStreamingMethodImplementation<Request, Response>,
  middleware?: ServerMiddleware,
): handleBidiStreamingCall<Request, Response> {
  const methodDescriptor: MethodDescriptor = {
    path: definition.path,
    requestStream: definition.requestStream,
    responseStream: definition.responseStream,
    options: definition.options,
  };

  async function* bidiStreamingMethodHandler(
    request: AsyncIterable<Request>,
    context: CallContext,
  ) {
    if (!isAsyncIterable(request)) {
      throw new Error(
        'A middleware passed invalid request to next(): expected a single message for bidirectional streaming method',
      );
    }

    yield* implementation(request, context);
  }

  const handler =
    middleware == null
      ? bidiStreamingMethodHandler
      : (request: AsyncIterable<Request>, context: CallContext) =>
          middleware(
            {
              method: methodDescriptor,
              requestStream: true,
              request,
              responseStream: true,
              next: bidiStreamingMethodHandler,
            },
            context,
          );

  return call => {
    const {context, maybeCancel} = createCallContext(call);

    Promise.resolve()
      .then(async () => {
        const iterable = handler(readableToAsyncIterable(call), context);
        const iterator = iterable[Symbol.asyncIterator]();

        try {
          let result = await iterator.next();

          while (true) {
            if (!result.done) {
              try {
                context.sendHeader();

                const shouldContinue = call.write(result.value);

                if (!shouldContinue) {
                  await waitForEvent(context.signal, call, 'drain');
                }
              } catch (err) {
                result = isAbortError(err)
                  ? await iterator.return()
                  : await iterator.throw(err);

                continue;
              }

              result = await iterator.next();

              continue;
            }

            if (result.value != null) {
              result = await iterator.throw(
                new Error(
                  'A middleware returned a message, but expected to return void for bidirectional streaming method',
                ),
              );

              continue;
            }

            break;
          }
        } finally {
          maybeCancel.cancel = undefined;
          context.sendHeader();
        }
      })
      .then(
        () => {
          call.end(convertMetadataToGrpcJs(context.trailer));
        },
        err => {
          call.emit(
            'error',
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
