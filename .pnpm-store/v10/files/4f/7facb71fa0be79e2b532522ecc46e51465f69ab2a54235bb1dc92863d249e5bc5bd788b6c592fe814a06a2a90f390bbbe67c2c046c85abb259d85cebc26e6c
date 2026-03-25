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
exports.MessageParser = void 0;
const assert = __importStar(require("assert"));
const events_1 = require("events");
const asn1_1 = require("asn1");
const errors_1 = require("./errors");
const messages_1 = require("./messages");
const ProtocolOperation_1 = require("./ProtocolOperation");
class MessageParser extends events_1.EventEmitter {
    read(data) {
        let nextMessage;
        if (this.buffer) {
            this.buffer = Buffer.concat([this.buffer, data]);
        }
        else {
            this.buffer = data;
        }
        const reader = new asn1_1.BerReader(this.buffer);
        let foundSequence = null;
        try {
            foundSequence = reader.readSequence();
        }
        catch (ex) {
            this.emit('error', ex);
        }
        if (!foundSequence || reader.remain < reader.length) {
            // Have not received enough data to successfully parse
            return;
        }
        if (reader.remain > reader.length) {
            // Received too much data
            nextMessage = this.buffer.slice(reader.offset + reader.length);
            reader._size = reader.offset + reader.length;
            assert.strictEqual(reader.remain, reader.length);
        }
        // Free up space since `ber` holds the current message and `nextMessage` is temporarily pointing
        // at the next sequence of data (if it exists)
        delete this.buffer;
        let messageId;
        let protocolOperation;
        try {
            messageId = reader.readInt();
            protocolOperation = reader.readSequence();
            const message = this._getMessageFromProtocolOperation(messageId, protocolOperation, reader);
            if (message) {
                this.emit('message', message);
            }
        }
        catch (ex) {
            if (messageId) {
                const errorWithMessageDetails = ex;
                errorWithMessageDetails.messageDetails = {
                    messageId,
                    protocolOperation,
                };
                this.emit('error', errorWithMessageDetails);
                return;
            }
            this.emit('error', ex);
            return;
        }
        if (nextMessage) {
            this.read(nextMessage);
        }
    }
    _getMessageFromProtocolOperation(messageId, protocolOperation, reader) {
        let message;
        switch (protocolOperation) {
            case ProtocolOperation_1.ProtocolOperation.LDAP_RES_BIND:
                message = new messages_1.BindResponse({
                    messageId,
                });
                break;
            case ProtocolOperation_1.ProtocolOperation.LDAP_RES_ADD:
                message = new messages_1.AddResponse({
                    messageId,
                });
                break;
            case ProtocolOperation_1.ProtocolOperation.LDAP_RES_COMPARE:
                message = new messages_1.CompareResponse({
                    messageId,
                });
                break;
            case ProtocolOperation_1.ProtocolOperation.LDAP_RES_DELETE:
                message = new messages_1.DeleteResponse({
                    messageId,
                });
                break;
            case ProtocolOperation_1.ProtocolOperation.LDAP_RES_EXTENSION:
                message = new messages_1.ExtendedResponse({
                    messageId,
                });
                break;
            case ProtocolOperation_1.ProtocolOperation.LDAP_RES_MODRDN:
                message = new messages_1.ModifyDNResponse({
                    messageId,
                });
                break;
            case ProtocolOperation_1.ProtocolOperation.LDAP_RES_MODIFY:
                message = new messages_1.ModifyResponse({
                    messageId,
                });
                break;
            case ProtocolOperation_1.ProtocolOperation.LDAP_RES_SEARCH:
                message = new messages_1.SearchResponse({
                    messageId,
                });
                break;
            case ProtocolOperation_1.ProtocolOperation.LDAP_RES_SEARCH_ENTRY:
                message = new messages_1.SearchEntry({
                    messageId,
                });
                break;
            case ProtocolOperation_1.ProtocolOperation.LDAP_RES_SEARCH_REF:
                message = new messages_1.SearchReference({
                    messageId,
                });
                break;
            default: {
                const error = new errors_1.MessageParserError(`Protocol Operation not supported: 0x${protocolOperation.toString(16)}`);
                error.messageDetails = {
                    messageId,
                    protocolOperation,
                };
                throw error;
            }
        }
        message.parse(reader);
        return message;
    }
}
exports.MessageParser = MessageParser;
//# sourceMappingURL=MessageParser.js.map