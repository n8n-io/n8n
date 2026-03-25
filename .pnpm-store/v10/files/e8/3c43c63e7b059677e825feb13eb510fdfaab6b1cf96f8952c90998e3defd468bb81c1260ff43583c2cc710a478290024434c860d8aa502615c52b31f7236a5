"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Message = void 0;
const asn1_1 = require("asn1");
const ControlParser_1 = require("../ControlParser");
const ProtocolOperation_1 = require("../ProtocolOperation");
class Message {
    constructor(options) {
        this.version = ProtocolOperation_1.ProtocolOperation.LDAP_VERSION_3;
        this.messageId = 0;
        this.messageId = options.messageId;
        this.controls = options.controls;
    }
    write() {
        const writer = new asn1_1.BerWriter();
        writer.startSequence();
        writer.writeInt(this.messageId);
        writer.startSequence(this.protocolOperation);
        this.writeMessage(writer);
        writer.endSequence();
        if (this.controls && this.controls.length) {
            writer.startSequence(ProtocolOperation_1.ProtocolOperation.LDAP_CONTROLS);
            for (const control of this.controls) {
                control.write(writer);
            }
            writer.endSequence();
        }
        writer.endSequence();
        return writer.buffer;
    }
    parse(reader) {
        this.controls = [];
        this.parseMessage(reader);
        if (reader.peek() === ProtocolOperation_1.ProtocolOperation.LDAP_CONTROLS) {
            reader.readSequence();
            const end = reader.offset + reader.length;
            while (reader.offset < end) {
                const control = ControlParser_1.ControlParser.parse(reader);
                if (control) {
                    this.controls.push(control);
                }
            }
        }
    }
    toString() {
        return JSON.stringify({
            messageId: this.messageId,
            messageType: this.constructor.name,
        }, null, 2);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    parseMessage(_) {
        // Do nothing as the default action
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    writeMessage(_) {
        // Do nothing as the default action
    }
}
exports.Message = Message;
//# sourceMappingURL=Message.js.map