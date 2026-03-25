"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModifyRequest = void 0;
const Change_1 = require("../Change");
const ProtocolOperation_1 = require("../ProtocolOperation");
const Message_1 = require("./Message");
class ModifyRequest extends Message_1.Message {
    constructor(options) {
        super(options);
        this.protocolOperation = ProtocolOperation_1.ProtocolOperation.LDAP_REQ_MODIFY;
        this.dn = options.dn || '';
        this.changes = options.changes || [];
    }
    writeMessage(writer) {
        writer.writeString(this.dn);
        writer.startSequence();
        for (const change of this.changes) {
            change.write(writer);
        }
        writer.endSequence();
    }
    parseMessage(reader) {
        this.dn = reader.readString();
        reader.readSequence();
        const end = reader.offset + reader.length;
        while (reader.offset < end) {
            const change = new Change_1.Change();
            change.parse(reader);
            this.changes.push(change);
        }
    }
}
exports.ModifyRequest = ModifyRequest;
//# sourceMappingURL=ModifyRequest.js.map