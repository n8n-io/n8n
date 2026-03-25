"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteRequest = void 0;
const ProtocolOperation_1 = require("../ProtocolOperation");
const Message_1 = require("./Message");
class DeleteRequest extends Message_1.Message {
    constructor(options) {
        super(options);
        this.protocolOperation = ProtocolOperation_1.ProtocolOperation.LDAP_REQ_DELETE;
        this.dn = options.dn || '';
    }
    writeMessage(writer) {
        const buffer = Buffer.from(this.dn);
        for (const byte of buffer) {
            writer.writeByte(byte);
        }
    }
    parseMessage(reader) {
        const { length } = reader;
        this.dn = reader.buffer.slice(0, length).toString('utf8');
        reader._offset += reader.length;
    }
}
exports.DeleteRequest = DeleteRequest;
//# sourceMappingURL=DeleteRequest.js.map