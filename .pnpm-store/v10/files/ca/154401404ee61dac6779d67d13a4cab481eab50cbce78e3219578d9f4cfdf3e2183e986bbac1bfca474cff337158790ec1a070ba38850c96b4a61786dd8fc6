import { asyncIterator as e } from "../ponyfill/asyncIterator.js";
ReadableStream.prototype.values ??= ReadableStream.prototype[Symbol.asyncIterator] ??= e;
ReadableStream.prototype[Symbol.asyncIterator] ??= ReadableStream.prototype.values;
