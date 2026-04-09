/**
 * A TransformStream that converts JSON objects to Server-Sent Events (SSE) format.
 * Each object is serialized to JSON and wrapped in `data: ...\n\n` format.
 * When the stream ends, a `data: [DONE]\n\n` message is sent.
 */
export class JsonToSseTransformStream extends TransformStream<unknown, string> {
  constructor() {
    super({
      transform(part, controller) {
        controller.enqueue(`data: ${JSON.stringify(part)}\n\n`);
      },
      flush(controller) {
        controller.enqueue('data: [DONE]\n\n');
      },
    });
  }
}
