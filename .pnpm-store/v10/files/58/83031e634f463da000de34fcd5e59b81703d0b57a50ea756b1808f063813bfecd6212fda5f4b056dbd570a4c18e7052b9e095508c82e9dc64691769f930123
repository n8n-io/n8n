import {Client, ClientWritableStream} from '@grpc/grpc-js';
import {
  execute,
  isAbortError,
  throwIfAborted,
  waitForEvent,
} from 'abort-controller-x';
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
import {ClientStreamingClientMethod} from './Client';
import {wrapClientError} from './wrapClientError';

/** @internal */
export function createClientStreamingMethod<Request, Response>(
  definition: MethodDefinition<Request, unknown, unknown, Response>,
  client: Client,
  middleware: ClientMiddleware | undefined,
  defaultOptions: CallOptions,
): ClientStreamingClientMethod<Request, Response> {
  const grpcMethodDefinition = toGrpcJsMethodDefinition(definition);

  const methodDescriptor: MethodDescriptor = {
    path: definition.path,
    requestStream: definition.requestStream,
    responseStream: definition.responseStream,
    options: definition.options,
  };

  async function* clientStreamingMethod(
    request: AsyncIterable<Request>,
    options: CallOptions,
  ): AsyncGenerator<never, Response, undefined> {
    if (!isAsyncIterable(request)) {
      throw new Error(
        'A middleware passed invalid request to next(): expected a single message for client streaming method',
      );
    }

    const {
      metadata = Metadata(),
      signal = new AbortController().signal,
      onHeader,
      onTrailer,
    } = options;

    return await execute<Response>(signal, (resolve, reject) => {
      const pipeAbortController = new AbortController();

      const call = client.makeClientStreamRequest(
        grpcMethodDefinition.path,
        grpcMethodDefinition.requestSerialize,
        grpcMethodDefinition.responseDeserialize,
        convertMetadataToGrpcJs(metadata),
        (err, response) => {
          pipeAbortController.abort();

          if (err != null) {
            reject(wrapClientError(err, definition.path));
          } else {
            resolve(response!);
          }
        },
      );

      call.on('metadata', metadata => {
        onHeader?.(convertMetadataFromGrpcJs(metadata));
      });
      call.on('status', status => {
        onTrailer?.(convertMetadataFromGrpcJs(status.metadata));
      });

      pipeRequest(pipeAbortController.signal, request, call).then(
        () => {
          call.end();
        },
        err => {
          if (!isAbortError(err)) {
            reject(err);
            call.cancel();
          }
        },
      );

      return () => {
        pipeAbortController.abort();
        call.cancel();
      };
    });
  }

  const method =
    middleware == null
      ? clientStreamingMethod
      : (request: AsyncIterable<Request>, options: CallOptions) =>
          middleware(
            {
              method: methodDescriptor,
              requestStream: true,
              request,
              responseStream: false,
              next: clientStreamingMethod,
            },
            options,
          );

  return async (request, options) => {
    const iterable = method(request, {
      ...defaultOptions,
      ...options,
    });
    const iterator = iterable[Symbol.asyncIterator]();

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
