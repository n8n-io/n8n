"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbandonRequest = void 0;
const assert = __importStar(require("assert"));
const ProtocolOperation_1 = require("../ProtocolOperation");
const Message_1 = require("./Message");
class AbandonRequest extends Message_1.Message {
    constructor(options) {
        super(options);
        this.protocolOperation = ProtocolOperation_1.ProtocolOperation.LDAP_REQ_ABANDON;
        this.abandonId = options.abandonId || 0;
    }
    /* eslint-disable no-bitwise */
    writeMessage(writer) {
        // Encode abandon request using different ASN.1 integer logic
        let i = this.abandonId;
        let intSize = 4;
        const mask = 0xff800000;
        while (((i & mask) === 0 || (i & mask) === mask) && intSize > 1) {
            intSize -= 1;
            i <<= 8;
        }
        assert.ok(intSize <= 4);
        // eslint-disable-next-line no-plusplus
        while (intSize-- > 0) {
            writer.writeByte((i & 0xff000000) >> 24);
            i <<= 8;
        }
    }
    parseMessage(reader) {
        const { length } = reader;
        if (length) {
            // Abandon request messages are encoded using different ASN.1 integer logic, forcing custom decoding logic
            let offset = 1;
            let value;
            const fb = reader.buffer[offset] ?? 0;
            value = fb & 0x7f;
            for (let i = 1; i < length; i += 1) {
                value <<= 8;
                offset += 1;
                const bufferValue = reader.buffer[offset] ?? 0;
                value |= bufferValue & 0xff;
            }
            if ((fb & 0x80) === 0x80) {
                value = -value;
            }
            reader._offset += length;
            this.abandonId = value;
        }
        else {
            this.abandonId = 0;
        }
    }
}
exports.AbandonRequest = AbandonRequest;
//# sourceMappingURL=AbandonRequest.js.map