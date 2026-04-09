import {
  generateId as generateIdFunc,
  getErrorMessage,
  IdGenerator,
} from '@ai-sdk/provider-utils';
import { UIMessage } from '../ui/ui-messages';
import { handleUIMessageStreamFinish } from './handle-ui-message-stream-finish';
import { InferUIMessageChunk } from './ui-message-chunks';
import { UIMessageStreamOnFinishCallback } from './ui-message-stream-on-finish-callback';
import { UIMessageStreamOnStepFinishCallback } from './ui-message-stream-on-step-finish-callback';
import { UIMessageStreamWriter } from './ui-message-stream-writer';

/**
 * Creates a UI message stream that can be used to send messages to the client.
 *
 * @param options.execute - A function that is called with a writer to write UI message chunks to the stream.
 * @param options.onError - A function that extracts an error message from an error. Defaults to `getErrorMessage`.
 * @param options.originalMessages - The original messages. If provided, persistence mode is assumed
 *   and a message ID is provided for the response message.
 * @param options.onStepFinish - A callback that is called when each step finishes. Useful for persisting intermediate messages.
 * @param options.onFinish - A callback that is called when the stream finishes.
 * @param options.generateId - A function that generates a unique ID. Defaults to the built-in ID generator.
 *
 * @returns A `ReadableStream` of UI message chunks.
 */
export function createUIMessageStream<UI_MESSAGE extends UIMessage>({
  execute,
  onError = getErrorMessage,
  originalMessages,
  onStepFinish,
  onFinish,
  generateId = generateIdFunc,
}: {
  execute: (options: {
    writer: UIMessageStreamWriter<UI_MESSAGE>;
  }) => Promise<void> | void;
  onError?: (error: unknown) => string;

  /**
   * The original messages. If they are provided, persistence mode is assumed,
   * and a message ID is provided for the response message.
   */
  originalMessages?: UI_MESSAGE[];

  /**
   * Callback that is called when each step finishes during multi-step agent runs.
   */
  onStepFinish?: UIMessageStreamOnStepFinishCallback<UI_MESSAGE>;

  onFinish?: UIMessageStreamOnFinishCallback<UI_MESSAGE>;

  generateId?: IdGenerator;
}): ReadableStream<InferUIMessageChunk<UI_MESSAGE>> {
  let controller!: ReadableStreamDefaultController<
    InferUIMessageChunk<UI_MESSAGE>
  >;

  const ongoingStreamPromises: Promise<void>[] = [];

  const stream = new ReadableStream({
    start(controllerArg) {
      controller = controllerArg;
    },
  });

  function safeEnqueue(data: InferUIMessageChunk<UI_MESSAGE>) {
    try {
      controller.enqueue(data);
    } catch (error) {
      // suppress errors when the stream has been closed
    }
  }

  try {
    const result = execute({
      writer: {
        write(part: InferUIMessageChunk<UI_MESSAGE>) {
          safeEnqueue(part);
        },
        merge(streamArg) {
          ongoingStreamPromises.push(
            (async () => {
              const reader = streamArg.getReader();
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                safeEnqueue(value);
              }
            })().catch(error => {
              safeEnqueue({
                type: 'error',
                errorText: onError(error),
              } as InferUIMessageChunk<UI_MESSAGE>);
            }),
          );
        },
        onError,
      },
    });

    if (result) {
      ongoingStreamPromises.push(
        result.catch(error => {
          safeEnqueue({
            type: 'error',
            errorText: onError(error),
          } as InferUIMessageChunk<UI_MESSAGE>);
        }),
      );
    }
  } catch (error) {
    safeEnqueue({
      type: 'error',
      errorText: onError(error),
    } as InferUIMessageChunk<UI_MESSAGE>);
  }

  // Wait until all ongoing streams are done. This approach enables merging
  // streams even after execute has returned, as long as there is still an
  // open merged stream. This is important to e.g. forward new streams and
  // from callbacks.
  const waitForStreams: Promise<void> = new Promise(async resolve => {
    while (ongoingStreamPromises.length > 0) {
      await ongoingStreamPromises.shift();
    }
    resolve();
  });

  waitForStreams.finally(() => {
    try {
      controller.close();
    } catch (error) {
      // suppress errors when the stream has been closed
    }
  });

  return handleUIMessageStreamFinish<UI_MESSAGE>({
    stream,
    messageId: generateId(),
    originalMessages,
    onStepFinish,
    onFinish,
    onError,
  });
}
