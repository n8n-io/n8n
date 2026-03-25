"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BindRequest = exports.SASL_MECHANISMS = void 0;
const asn1_1 = require("asn1");
const ProtocolOperation_1 = require("../ProtocolOperation");
const Message_1 = require("./Message");
exports.SASL_MECHANISMS = ['EXTERNAL', 'PLAIN', 'DIGEST-MD5', 'SCRAM-SHA-1'];
class BindRequest extends Message_1.Message {
    constructor(options) {
        super(options);
        this.protocolOperation = ProtocolOperation_1.ProtocolOperation.LDAP_REQ_BIND;
        this.dn = options.dn || '';
        this.password = options.password;
        this.mechanism = options.mechanism;
    }
    writeMessage(writer) {
        writer.writeInt(this.version);
        writer.writeString(this.dn);
        if (this.mechanism) {
            // SASL authentication
            writer.startSequence(ProtocolOperation_1.ProtocolOperation.LDAP_REQ_BIND_SASL);
            writer.writeString(this.mechanism);
            if (typeof this.password === 'string') {
                writer.writeString(this.password);
            }
            writer.endSequence();
        }
        else if (typeof this.password === 'string') {
            // Simple authentication
            writer.writeString(this.password, asn1_1.Ber.Context); // 128
        }
    }
    parseMessage(reader) {
        this.version = reader.readInt();
        this.dn = reader.readString();
        const contextCheck = reader.peek();
        if (contextCheck !== asn1_1.Ber.Context) {
            let type = '<null>';
            if (contextCheck) {
                type = `0x${contextCheck.toString(16)}`;
            }
            throw new Error(`Authentication type not supported: ${type}`);
        }
        this.password = reader.readString(asn1_1.Ber.Context);
    }
}
exports.BindRequest = BindRequest;
//# sourceMappingURL=BindRequest.js.map