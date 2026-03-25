// src/helper/streaming/text.ts
import { TEXT_PLAIN } from "../../context.js";
import { stream } from "./index.js";
var streamText = (c, cb, onError) => {
  c.header("Content-Type", TEXT_PLAIN);
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Transfer-Encoding", "chunked");
  return stream(c, cb, onError);
};
export {
  streamText
};
