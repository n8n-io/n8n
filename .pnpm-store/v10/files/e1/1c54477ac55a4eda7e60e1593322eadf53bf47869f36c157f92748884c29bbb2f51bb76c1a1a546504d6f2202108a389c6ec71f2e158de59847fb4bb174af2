"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationIdUrlSafe = void 0;
// eslint-disable-next-line no-useless-escape
const validUrlSymbols = /^[A-Za-z0-9-._~:/?#\[\]@!\$&'()*+,;=]*$/;
const OperationIdUrlSafe = () => {
    return {
        Operation(operation, { report, location }) {
            if (operation.operationId && !validUrlSymbols.test(operation.operationId)) {
                report({
                    message: 'Operation `operationId` should not have URL invalid characters.',
                    location: location.child(['operationId']),
                });
            }
        },
    };
};
exports.OperationIdUrlSafe = OperationIdUrlSafe;
