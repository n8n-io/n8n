"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompareRequest = void 0;
const ProtocolOperation_1 = require("../ProtocolOperation");
const Message_1 = require("./Message");
class CompareRequest extends Message_1.Message {
    constructor(options) {
        super(options);
        this.protocolOperation = ProtocolOperation_1.ProtocolOperation.LDAP_REQ_COMPARE;
        this.attribute = options.attribute || '';
        this.value = options.value || '';
        this.dn = options.dn || '';
    }
    writeMessage(writer) {
        writer.writeString(this.dn);
        writer.startSequence();
        writer.writeString(this.attribute);
        writer.writeString(this.value);
        writer.endSequence();
    }
    parseMessage(reader) {
        this.dn = reader.readString();
        reader.readSequence();
        this.attribute = (reader.readString() || '').toLowerCase();
        this.value = reader.readString();
    }
}
exports.CompareRequest = CompareRequest;
//# sourceMappingURL=CompareRequest.js.map