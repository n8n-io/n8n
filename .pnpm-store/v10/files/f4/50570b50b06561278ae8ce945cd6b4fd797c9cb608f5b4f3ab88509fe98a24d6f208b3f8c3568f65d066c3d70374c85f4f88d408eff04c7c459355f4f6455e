"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.composeClientMiddleware = void 0;
function composeClientMiddleware(middleware1, middleware2) {
    return (call, options) => {
        return middleware2(Object.assign(Object.assign({}, call), { next: (request, options2) => {
                return middleware1(Object.assign(Object.assign({}, call), { request }), options2);
            } }), options);
    };
}
exports.composeClientMiddleware = composeClientMiddleware;
//# sourceMappingURL=composeClientMiddleware.js.map