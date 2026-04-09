import { createResolvablePromise } from './create-resolvable-promise';

/**
 * Creates a stitchable stream that can pipe one stream at a time.
 *
 * @template T - The type of values emitted by the streams.
 * @returns {Object} An object containing the stitchable stream and control methods.
 */
export function createStitchableStream<T>(): {
  stream: ReadableStream<T>;
  addStream: (innerStream: ReadableStream<T>) => void;
  close: () => void;
  terminate: () => void;
} {
  let innerStreamReaders: ReadableStreamDefaultReader<T>[] = [];
  let controller: ReadableStreamDefaultController<T> | null = null;
  let isClosed = false;
  let waitForNewStream = createResolvablePromise<void>();

  const terminate = () => {
    isClosed = true;
    waitForNewStream.resolve();

    innerStreamReaders.forEach(reader => reader.cancel());
    innerStreamReaders = [];
    controller?.close();
  };

  const processPull = async () => {
    // Case 1: Outer stream is closed and no more inner streams
    if (isClosed && innerStreamReaders.length === 0) {
      controller?.close();
      return;
    }

    // Case 2: No inner streams available, but outer stream is open
    // wait for a new inner stream to be added or the outer stream to close
    if (innerStreamReaders.length === 0) {
      waitForNewStream = createResolvablePromise<void>();
      await waitForNewStream.promise;
      return processPull();
    }

    try {
      const { value, done } = await innerStreamReaders[0].read();

      if (done) {
        // Case 3: Current inner stream is done
        innerStreamReaders.shift(); // Remove the finished stream

        if (innerStreamReaders.length === 0 && isClosed) {
          // when closed and no more inner streams, stop pulling
          controller?.close();
        } else {
          // continue pulling from the next stream
          await processPull();
        }
      } else {
        // Case 4: Current inner stream returns an item
        controller?.enqueue(value);
      }
    } catch (error) {
      // Case 5: Current inner stream throws an error
      controller?.error(error);
      innerStreamReaders.shift(); // Remove the errored stream
      terminate(); // we have errored, terminate all streams
    }
  };

  return {
    stream: new ReadableStream<T>({
      start(controllerParam) {
        controller = controllerParam;
      },
      pull: processPull,
      async cancel() {
        for (const reader of innerStreamReaders) {
          await reader.cancel();
        }
        innerStreamReaders = [];
        isClosed = true;
      },
    }),
    addStream: (innerStream: ReadableStream<T>) => {
      if (isClosed) {
        throw new Error('Cannot add inner stream: outer stream is closed');
      }

      innerStreamReaders.push(innerStream.getReader());
      waitForNewStream.resolve();
    },

    /**
     * Gracefully close the outer stream. This will let the inner streams
     * finish processing and then close the outer stream.
     */
    close: () => {
      isClosed = true;
      waitForNewStream.resolve();

      if (innerStreamReaders.length === 0) {
        controller?.close();
      }
    },

    /**
     * Immediately close the outer stream. This will cancel all inner streams
     * and close the outer stream.
     */
    terminate,
  };
}
