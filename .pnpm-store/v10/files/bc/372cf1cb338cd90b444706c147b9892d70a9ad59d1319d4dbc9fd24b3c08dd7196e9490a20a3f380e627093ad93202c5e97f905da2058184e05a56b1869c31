import { __asyncGenerator, __await } from "tslib";
import { isFunction } from './isFunction';
export function readableStreamLikeToAsyncGenerator(readableStream) {
    return __asyncGenerator(this, arguments, function* readableStreamLikeToAsyncGenerator_1() {
        const reader = readableStream.getReader();
        try {
            while (true) {
                const { value, done } = yield __await(reader.read());
                if (done) {
                    return yield __await(void 0);
                }
                yield yield __await(value);
            }
        }
        finally {
            reader.releaseLock();
        }
    });
}
export function isReadableStreamLike(obj) {
    return isFunction(obj === null || obj === void 0 ? void 0 : obj.getReader);
}
//# sourceMappingURL=isReadableStreamLike.js.map