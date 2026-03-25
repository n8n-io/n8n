"use strict";
Object.defineProperty(exports, "__esModule", { value: !0 });
var index = require("./index.cjs");
class EventSourceParserStream extends TransformStream {
  constructor({ onError, onRetry, onComment } = {}) {
    let parser;
    super({
      start(controller) {
        parser = index.createParser({
          onEvent: (event) => {
            controller.enqueue(event);
          },
          onError(error) {
            onError === "terminate" ? controller.error(error) : typeof onError == "function" && onError(error);
          },
          onRetry,
          onComment
        });
      },
      transform(chunk) {
        parser.feed(chunk);
      }
    });
  }
}
exports.ParseError = index.ParseError;
exports.EventSourceParserStream = EventSourceParserStream;
//# sourceMappingURL=stream.cjs.map
