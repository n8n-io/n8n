"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Attribute = void 0;
const asn1_1 = require("asn1");
const ProtocolOperation_1 = require("./ProtocolOperation");
class Attribute {
    constructor(options = {}) {
        this.buffers = [];
        this.type = options.type || '';
        this.values = options.values || [];
    }
    get parsedBuffers() {
        return this.buffers;
    }
    write(writer) {
        writer.startSequence();
        const { type } = this;
        writer.writeString(type);
        writer.startSequence(ProtocolOperation_1.ProtocolOperation.LBER_SET);
        if (this.values.length) {
            for (const value of this.values) {
                if (Buffer.isBuffer(value)) {
                    writer.writeBuffer(value, asn1_1.Ber.OctetString);
                }
                else {
                    writer.writeString(value);
                }
            }
        }
        else {
            writer.writeStringArray([]);
        }
        writer.endSequence();
        writer.endSequence();
    }
    parse(reader) {
        reader.readSequence();
        this.type = reader.readString();
        const isBinaryType = this._isBinaryType();
        if (reader.peek() === ProtocolOperation_1.ProtocolOperation.LBER_SET) {
            if (reader.readSequence(ProtocolOperation_1.ProtocolOperation.LBER_SET)) {
                const end = reader.offset + reader.length;
                while (reader.offset < end) {
                    const buffer = reader.readString(asn1_1.Ber.OctetString, true) || Buffer.alloc(0);
                    this.buffers.push(buffer);
                    if (isBinaryType) {
                        this.values.push(buffer);
                    }
                    else {
                        this.values.push(buffer.toString('utf8'));
                    }
                }
            }
        }
    }
    _isBinaryType() {
        return /;binary$/i.test(this.type || '');
    }
}
exports.Attribute = Attribute;
//# sourceMappingURL=Attribute.js.map