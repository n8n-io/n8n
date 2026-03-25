import {Client, ClientWritableStream} from '@grpc/grpc-js';
import {isAbortError, throwIfAborted, waitForEvent} from 'abort-controller-x';
import {
  CallOptions,
  ClientMiddleware,
  Metadata,
  MethodDescriptor,
} from 'nice-grpc-common';
import {
  MethodDefinition,
  toGrpcJsMethodDefinition,
} from '../service-definitions';
import {
  convertMetadataFromGrpcJs,
  convertMetadataToGrpcJs,
} from '../utils/convertMetadata';
import {isAsyncIterable} from '../utils/isAsyncIterable';
import {readableToAsyncIterable} from '../utils/readableToAsyncIterable';
import {BidiStreamingClientMethod} from './Client';
import {wrapClientError} from './wrapClientError';

/** @internal */
export function createBidiStreamingMethod<Request, Response>(
  definition: MethodDefinition<Request, unknown, unknown, Response>,
  client: Client,
  middleware: ClientMiddleware | undefined,
  defaultOptions: CallOptions,
): BidiStreamingClientMethod<Request, Response> {
  const grpcMethodDefinition = toGrpcJsMethodDefinition(definition);

  const methodDescriptor: MethodDescriptor = {
    path: definition.path,
    requestStream: definition.requestStream,
    responseStream: definition.responseStream,
    options: definition.options,
  };

  async function* bidiStreamingMethod(
    request: AsyncIterable<Request>,
    options: CallOptions,
  ): AsyncGenerator<Response, void, undefined> {
    if (!isAsyncIterable(request)) {
      throw new Error(
        'A middleware passed invalid request to next(): expected a single message for bidirectional streaming method',
      );
    }

    const {metadata = Metadata(), onHeader, onTrailer} = options;

    const signal = options.signal ?? new AbortController().signal;

    const pipeAbortController = new AbortController();

    const call = client.makeBidiStreamRequest(
      grpcMethodDefinition.path,
      grpcMethodDefinition.requestSerialize,
      grpcMethodDefinition.responseDeserialize,
      convertMetadataToGrpcJs(metadata),
    );

    call.on('metadata', metadata => {
      onHeader?.(convertMetadataFromGrpcJs(metadata));
    });
    call.on('status', status => {
      onTrailer?.(convertMetadataFromGrpcJs(status.metadata));
    });

    let pipeError: unknown;

    pipeRequest(pipeAbortController.signal, request, call).then(
      () => {
        call.end();
      },
      err => {
        if (!isAbortError(err)) {
          pipeError = err;
          call.cancel();
        }
      },
    );

    const abortListener = () => {
      pipeAbortController.abort();
      call.cancel();
    };

    signal.addEventListener('abort', abortListener);

    try {
      yield* readableToAsyncIterable(call);
    } catch (err) {
      throw wrapClientError(err, definition.path);
    } finally {
      pipeAbortController.abort();
      signal.removeEventListener('abort', abortListener);
      throwIfAborted(signal);

      call.cancel();

      if (pipeError) {
        throw pipeError;
      }
    }
  }

  const method =
    middleware == null
      ? bidiStreamingMethod
      : (request: AsyncIterable<Request>, options: CallOptions) =>
          middleware(
            {
              method: methodDescriptor,
              requestStream: true,
              request,
              responseStream: true,
              next: bidiStreamingMethod,
            },
            options,
          );

  return (request, options) => {
    const iterable = method(request, {
      ...defaultOptions,
      ...options,
    });
    const iterator = iterable[Symbol.asyncIterator]();

    return {
      [Symbol.asyncIterator]() {
        return {
          async next() {
            const result = await iterator.next();

            if (result.done && result.value != null) {
              return await iterator.throw(
                new Error(
                  'A middleware returned a message, but expected to return void for bidirectional streaming method',
                ),
              );
            }

            return result;
          },
          return() {
            return iterator.return();
          },
          throw(err) {
            return iterator.throw(err);
          },
        };
      },
    };
  };
}

async function pipeRequest<Request>(
  signal: AbortSignal,
  request: AsyncIterable<Request>,
  call: ClientWritableStream<Request>,
): Promise<void> {
  for await (const item of request) {
    throwIfAborted(signal);

    const shouldContinue = call.write(item);

    if (!shouldContinue) {
      await waitForEvent(signal, call, 'drain');
    }
  }
}
