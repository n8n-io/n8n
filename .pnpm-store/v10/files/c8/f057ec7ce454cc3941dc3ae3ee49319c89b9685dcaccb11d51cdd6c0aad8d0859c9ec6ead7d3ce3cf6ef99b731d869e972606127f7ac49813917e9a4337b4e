// src/middleware/body-limit/index.ts
import { HTTPException } from "../../http-exception.js";
var ERROR_MESSAGE = "Payload Too Large";
var BodyLimitError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "BodyLimitError";
  }
};
var bodyLimit = (options) => {
  const onError = options.onError || (() => {
    const res = new Response(ERROR_MESSAGE, {
      status: 413
    });
    throw new HTTPException(413, { res });
  });
  const maxSize = options.maxSize;
  return async function bodyLimit2(c, next) {
    if (!c.req.raw.body) {
      return next();
    }
    const hasTransferEncoding = c.req.raw.headers.has("transfer-encoding");
    const hasContentLength = c.req.raw.headers.has("content-length");
    if (hasTransferEncoding && hasContentLength) {
    }
    if (hasContentLength && !hasTransferEncoding) {
      const contentLength = parseInt(c.req.raw.headers.get("content-length") || "0", 10);
      return contentLength > maxSize ? onError(c) : next();
    }
    let size = 0;
    const rawReader = c.req.raw.body.getReader();
    const reader = new ReadableStream({
      async start(controller) {
        try {
          for (; ; ) {
            const { done, value } = await rawReader.read();
            if (done) {
              break;
            }
            size += value.length;
            if (size > maxSize) {
              controller.error(new BodyLimitError(ERROR_MESSAGE));
              break;
            }
            controller.enqueue(value);
          }
        } finally {
          controller.close();
        }
      }
    });
    const requestInit = { body: reader, duplex: "half" };
    c.req.raw = new Request(c.req.raw, requestInit);
    await next();
    if (c.error instanceof BodyLimitError) {
      c.res = await onError(c);
    }
  };
};
export {
  bodyLimit
};
