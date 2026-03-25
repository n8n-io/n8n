"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddRequest = void 0;
const Attribute_1 = require("../Attribute");
const ProtocolOperation_1 = require("../ProtocolOperation");
const Message_1 = require("./Message");
class AddRequest extends Message_1.Message {
    constructor(options) {
        super(options);
        this.protocolOperation = ProtocolOperation_1.ProtocolOperation.LDAP_REQ_ADD;
        this.dn = options.dn;
        this.attributes = options.attributes || [];
    }
    writeMessage(writer) {
        writer.writeString(this.dn);
        writer.startSequence();
        for (const attribute of this.attributes) {
            attribute.write(writer);
        }
        writer.endSequence();
    }
    parseMessage(reader) {
        this.dn = reader.readString();
        reader.readSequence();
        const end = reader.offset + reader.length;
        while (reader.offset < end) {
            const attribute = new Attribute_1.Attribute();
            attribute.parse(reader);
            this.attributes.push(attribute);
        }
    }
}
exports.AddRequest = AddRequest;
//# sourceMappingURL=AddRequest.js.map