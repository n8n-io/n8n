// src/adapter/service-worker/index.ts
import { handle } from "./handler.js";
var fire = (app, options = {
  fetch: void 0
}) => {
  addEventListener("fetch", handle(app, options));
};
export {
  fire,
  handle
};
