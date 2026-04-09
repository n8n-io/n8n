import { UIMessage } from '../ui';
import { ErrorHandler } from '../util/error-handler';
import { InferUIMessageChunk } from './ui-message-chunks';

export interface UIMessageStreamWriter<
  UI_MESSAGE extends UIMessage = UIMessage,
> {
  /**
   * Appends a data stream part to the stream.
   */
  write(part: InferUIMessageChunk<UI_MESSAGE>): void;

  /**
   * Merges the contents of another stream to this stream.
   */
  merge(stream: ReadableStream<InferUIMessageChunk<UI_MESSAGE>>): void;

  /**
   * Error handler that is used by the data stream writer.
   * This is intended for forwarding when merging streams
   * to prevent duplicated error masking.
   */
  onError: ErrorHandler | undefined;
}
