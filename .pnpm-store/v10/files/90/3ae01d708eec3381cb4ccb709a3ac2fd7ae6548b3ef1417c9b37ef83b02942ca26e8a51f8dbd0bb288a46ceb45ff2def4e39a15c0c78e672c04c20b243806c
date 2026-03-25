"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function once(emitter, name, { signal } = {}) {
    return new Promise((resolve, reject) => {
        function cleanup() {
            signal === null || signal === void 0 ? void 0 : signal.removeEventListener('abort', cleanup);
            emitter.removeListener(name, onEvent);
            emitter.removeListener('error', onError);
        }
        function onEvent(...args) {
            cleanup();
            resolve(args);
        }
        function onError(err) {
            cleanup();
            reject(err);
        }
        signal === null || signal === void 0 ? void 0 : signal.addEventListener('abort', cleanup);
        emitter.on(name, onEvent);
        emitter.on('error', onError);
    });
}
exports.default = once;
//# sourceMappingURL=index.js.map