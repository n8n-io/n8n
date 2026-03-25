"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtendedResponse = exports.ExtendedResponseProtocolOperations = void 0;
const ProtocolOperation_1 = require("../ProtocolOperation");
const MessageResponse_1 = require("./MessageResponse");
var ExtendedResponseProtocolOperations;
(function (ExtendedResponseProtocolOperations) {
    ExtendedResponseProtocolOperations[ExtendedResponseProtocolOperations["oid"] = 138] = "oid";
    ExtendedResponseProtocolOperations[ExtendedResponseProtocolOperations["value"] = 139] = "value";
})(ExtendedResponseProtocolOperations = exports.ExtendedResponseProtocolOperations || (exports.ExtendedResponseProtocolOperations = {}));
class ExtendedResponse extends MessageResponse_1.MessageResponse {
    constructor(options) {
        super(options);
        this.protocolOperation = ProtocolOperation_1.ProtocolOperation.LDAP_RES_EXTENSION;
        this.oid = options.oid;
        this.value = options.value;
    }
    parseMessage(reader) {
        super.parseMessage(reader);
        if (reader.peek() === ExtendedResponseProtocolOperations.oid) {
            this.oid = reader.readString(ExtendedResponseProtocolOperations.oid);
        }
        if (reader.peek() === ExtendedResponseProtocolOperations.value) {
            this.value = reader.readString(ExtendedResponseProtocolOperations.value);
        }
    }
}
exports.ExtendedResponse = ExtendedResponse;
//# sourceMappingURL=ExtendedResponse.js.map