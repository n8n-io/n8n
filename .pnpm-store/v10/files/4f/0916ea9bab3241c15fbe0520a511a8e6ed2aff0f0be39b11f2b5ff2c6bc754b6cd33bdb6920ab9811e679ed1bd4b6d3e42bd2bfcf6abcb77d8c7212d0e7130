// src/utils/handler.ts
import { COMPOSED_HANDLER } from "./constants.js";
var isMiddleware = (handler) => handler.length > 1;
var findTargetHandler = (handler) => {
  return handler[COMPOSED_HANDLER] ? (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findTargetHandler(handler[COMPOSED_HANDLER])
  ) : handler;
};
export {
  findTargetHandler,
  isMiddleware
};
