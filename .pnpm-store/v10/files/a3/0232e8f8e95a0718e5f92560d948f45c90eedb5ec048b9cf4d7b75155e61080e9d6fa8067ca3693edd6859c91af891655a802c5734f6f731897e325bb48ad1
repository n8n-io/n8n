import { UIMessageChunk } from '../ui-message-stream/ui-message-chunks';
import {
  HttpChatTransport,
  HttpChatTransportInitOptions,
} from './http-chat-transport';
import { transformTextToUiMessageStream } from './transform-text-to-ui-message-stream';
import { UIMessage } from './ui-messages';

export class TextStreamChatTransport<
  UI_MESSAGE extends UIMessage,
> extends HttpChatTransport<UI_MESSAGE> {
  constructor(options: HttpChatTransportInitOptions<UI_MESSAGE> = {}) {
    super(options);
  }

  protected processResponseStream(
    stream: ReadableStream<Uint8Array<ArrayBufferLike>>,
  ): ReadableStream<UIMessageChunk> {
    return transformTextToUiMessageStream({
      stream: stream.pipeThrough(new TextDecoderStream()),
    });
  }
}
