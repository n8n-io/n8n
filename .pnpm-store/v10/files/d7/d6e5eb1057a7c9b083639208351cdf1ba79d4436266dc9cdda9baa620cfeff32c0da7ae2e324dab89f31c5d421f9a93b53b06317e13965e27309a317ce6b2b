"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtendedRequest = void 0;
const ProtocolOperation_1 = require("../ProtocolOperation");
const Message_1 = require("./Message");
class ExtendedRequest extends Message_1.Message {
    constructor(options) {
        super(options);
        this.protocolOperation = ProtocolOperation_1.ProtocolOperation.LDAP_REQ_EXTENSION;
        this.oid = options.oid || '';
        this.value = options.value || '';
    }
    writeMessage(writer) {
        writer.writeString(this.oid, 0x80);
        if (Buffer.isBuffer(this.value)) {
            writer.writeBuffer(this.value, 0x81);
        }
        else if (this.value) {
            writer.writeString(this.value, 0x81);
        }
    }
    parseMessage(reader) {
        this.oid = reader.readString(0x80);
        if (reader.peek() === 0x81) {
            try {
                this.value = reader.readString(0x81);
            }
            catch (ex) {
                this.value = reader.readString(0x81, true);
            }
        }
    }
}
exports.ExtendedRequest = ExtendedRequest;
//# sourceMappingURL=ExtendedRequest.js.map