"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModifyDNRequest = void 0;
const ProtocolOperation_1 = require("../ProtocolOperation");
const Message_1 = require("./Message");
class ModifyDNRequest extends Message_1.Message {
    constructor(options) {
        super(options);
        this.protocolOperation = ProtocolOperation_1.ProtocolOperation.LDAP_REQ_MODRDN;
        this.deleteOldRdn = options.deleteOldRdn !== false;
        this.dn = options.dn || '';
        this.newRdn = options.newRdn || '';
        this.newSuperior = options.newSuperior || '';
    }
    writeMessage(writer) {
        writer.writeString(this.dn);
        writer.writeString(this.newRdn);
        writer.writeBoolean(this.deleteOldRdn);
        if (this.newSuperior) {
            const length = Buffer.byteLength(this.newSuperior);
            writer.writeByte(0x80);
            writer.writeByte(length);
            writer._ensure(length);
            writer._buf.write(this.newSuperior, writer._offset);
            writer._offset += length;
        }
    }
    parseMessage(reader) {
        this.dn = reader.readString();
        this.newRdn = reader.readString();
        this.deleteOldRdn = reader.readBoolean();
        if (reader.peek() === 0x80) {
            this.newSuperior = reader.readString(0x80);
        }
    }
}
exports.ModifyDNRequest = ModifyDNRequest;
//# sourceMappingURL=ModifyDNRequest.js.map