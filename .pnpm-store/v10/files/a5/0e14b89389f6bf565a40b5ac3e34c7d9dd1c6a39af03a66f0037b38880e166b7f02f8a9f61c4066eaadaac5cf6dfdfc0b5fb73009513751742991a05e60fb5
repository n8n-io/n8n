"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaslBindInProgressError = void 0;
const ResultCodeError_1 = require("./ResultCodeError");
class SaslBindInProgressError extends ResultCodeError_1.ResultCodeError {
    constructor(response) {
        super(14, response.errorMessage || 'The server is ready for the next step in the SASL authentication process. The client must send the server the same SASL Mechanism to continue the process.');
        this.response = response;
    }
}
exports.SaslBindInProgressError = SaslBindInProgressError;
//# sourceMappingURL=SaslBindInProgressError.js.map