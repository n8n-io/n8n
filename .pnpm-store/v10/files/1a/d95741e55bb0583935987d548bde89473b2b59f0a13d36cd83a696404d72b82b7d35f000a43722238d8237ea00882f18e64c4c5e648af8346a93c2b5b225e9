"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompareResponse = exports.CompareResult = void 0;
const ProtocolOperation_1 = require("../ProtocolOperation");
const MessageResponse_1 = require("./MessageResponse");
var CompareResult;
(function (CompareResult) {
    /**
     * Indicates that the target entry exists and contains the specified attribute with the indicated value
     */
    CompareResult[CompareResult["compareTrue"] = 6] = "compareTrue";
    /**
     * Indicates that the target entry exists and contains the specified attribute, but that the attribute does not have the indicated value
     */
    CompareResult[CompareResult["compareFalse"] = 5] = "compareFalse";
    /**
     * Indicates that the target entry exists but does not contain the specified attribute
     */
    CompareResult[CompareResult["noSuchAttribute"] = 22] = "noSuchAttribute";
    /**
     * Indicates that the target entry does not exist
     */
    CompareResult[CompareResult["noSuchObject"] = 50] = "noSuchObject";
})(CompareResult = exports.CompareResult || (exports.CompareResult = {}));
class CompareResponse extends MessageResponse_1.MessageResponse {
    constructor(options) {
        super(options);
        this.protocolOperation = ProtocolOperation_1.ProtocolOperation.LDAP_RES_COMPARE;
    }
}
exports.CompareResponse = CompareResponse;
//# sourceMappingURL=CompareResponse.js.map