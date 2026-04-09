import { parseJsonEventStream, ParseResult } from '@ai-sdk/provider-utils';
import {
  UIMessageChunk,
  uiMessageChunkSchema,
} from '../ui-message-stream/ui-message-chunks';
import {
  HttpChatTransport,
  HttpChatTransportInitOptions,
} from './http-chat-transport';
import { UIMessage } from './ui-messages';

export class DefaultChatTransport<
  UI_MESSAGE extends UIMessage,
> extends HttpChatTransport<UI_MESSAGE> {
  constructor(options: HttpChatTransportInitOptions<UI_MESSAGE> = {}) {
    super(options);
  }

  protected processResponseStream(
    stream: ReadableStream<Uint8Array<ArrayBufferLike>>,
  ): ReadableStream<UIMessageChunk> {
    return parseJsonEventStream({
      stream,
      schema: uiMessageChunkSchema,
    }).pipeThrough(
      new TransformStream<ParseResult<UIMessageChunk>, UIMessageChunk>({
        async transform(chunk, controller) {
          if (!chunk.success) {
            throw chunk.error;
          }
          controller.enqueue(chunk.value);
        },
      }),
    );
  }
}
