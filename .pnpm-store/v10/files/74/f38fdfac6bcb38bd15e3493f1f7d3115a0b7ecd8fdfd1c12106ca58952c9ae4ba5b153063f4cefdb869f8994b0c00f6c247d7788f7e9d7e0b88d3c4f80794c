"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const messages_1 = require("./messages");
const buffer_reader_1 = require("./buffer-reader");
// every message is prefixed with a single bye
const CODE_LENGTH = 1;
// every message has an int32 length which includes itself but does
// NOT include the code in the length
const LEN_LENGTH = 4;
const HEADER_LENGTH = CODE_LENGTH + LEN_LENGTH;
const emptyBuffer = Buffer.allocUnsafe(0);
class Parser {
    constructor(opts) {
        this.buffer = emptyBuffer;
        this.bufferLength = 0;
        this.bufferOffset = 0;
        this.reader = new buffer_reader_1.BufferReader();
        if ((opts === null || opts === void 0 ? void 0 : opts.mode) === 'binary') {
            throw new Error('Binary mode not supported yet');
        }
        this.mode = (opts === null || opts === void 0 ? void 0 : opts.mode) || 'text';
    }
    parse(buffer, callback) {
        this.mergeBuffer(buffer);
        const bufferFullLength = this.bufferOffset + this.bufferLength;
        let offset = this.bufferOffset;
        while (offset + HEADER_LENGTH <= bufferFullLength) {
            // code is 1 byte long - it identifies the message type
            const code = this.buffer[offset];
            // length is 1 Uint32BE - it is the length of the message EXCLUDING the code
            const length = this.buffer.readUInt32BE(offset + CODE_LENGTH);
            const fullMessageLength = CODE_LENGTH + length;
            if (fullMessageLength + offset <= bufferFullLength) {
                const message = this.handlePacket(offset + HEADER_LENGTH, code, length, this.buffer);
                callback(message);
                offset += fullMessageLength;
            }
            else {
                break;
            }
        }
        if (offset === bufferFullLength) {
            // No more use for the buffer
            this.buffer = emptyBuffer;
            this.bufferLength = 0;
            this.bufferOffset = 0;
        }
        else {
            // Adjust the cursors of remainingBuffer
            this.bufferLength = bufferFullLength - offset;
            this.bufferOffset = offset;
        }
    }
    mergeBuffer(buffer) {
        if (this.bufferLength > 0) {
            const newLength = this.bufferLength + buffer.byteLength;
            const newFullLength = newLength + this.bufferOffset;
            if (newFullLength > this.buffer.byteLength) {
                // We can't concat the new buffer with the remaining one
                let newBuffer;
                if (newLength <= this.buffer.byteLength && this.bufferOffset >= this.bufferLength) {
                    // We can move the relevant part to the beginning of the buffer instead of allocating a new buffer
                    newBuffer = this.buffer;
                }
                else {
                    // Allocate a new larger buffer
                    let newBufferLength = this.buffer.byteLength * 2;
                    while (newLength >= newBufferLength) {
                        newBufferLength *= 2;
                    }
                    newBuffer = Buffer.allocUnsafe(newBufferLength);
                }
                // Move the remaining buffer to the new one
                this.buffer.copy(newBuffer, 0, this.bufferOffset, this.bufferOffset + this.bufferLength);
                this.buffer = newBuffer;
                this.bufferOffset = 0;
            }
            // Concat the new buffer with the remaining one
            buffer.copy(this.buffer, this.bufferOffset + this.bufferLength);
            this.bufferLength = newLength;
        }
        else {
            this.buffer = buffer;
            this.bufferOffset = 0;
            this.bufferLength = buffer.byteLength;
        }
    }
    handlePacket(offset, code, length, bytes) {
        switch (code) {
            case 50 /* MessageCodes.BindComplete */:
                return messages_1.bindComplete;
            case 49 /* MessageCodes.ParseComplete */:
                return messages_1.parseComplete;
            case 51 /* MessageCodes.CloseComplete */:
                return messages_1.closeComplete;
            case 110 /* MessageCodes.NoData */:
                return messages_1.noData;
            case 115 /* MessageCodes.PortalSuspended */:
                return messages_1.portalSuspended;
            case 99 /* MessageCodes.CopyDone */:
                return messages_1.copyDone;
            case 87 /* MessageCodes.ReplicationStart */:
                return messages_1.replicationStart;
            case 73 /* MessageCodes.EmptyQuery */:
                return messages_1.emptyQuery;
            case 68 /* MessageCodes.DataRow */:
                return this.parseDataRowMessage(offset, length, bytes);
            case 67 /* MessageCodes.CommandComplete */:
                return this.parseCommandCompleteMessage(offset, length, bytes);
            case 90 /* MessageCodes.ReadyForQuery */:
                return this.parseReadyForQueryMessage(offset, length, bytes);
            case 65 /* MessageCodes.NotificationResponse */:
                return this.parseNotificationMessage(offset, length, bytes);
            case 82 /* MessageCodes.AuthenticationResponse */:
                return this.parseAuthenticationResponse(offset, length, bytes);
            case 83 /* MessageCodes.ParameterStatus */:
                return this.parseParameterStatusMessage(offset, length, bytes);
            case 75 /* MessageCodes.BackendKeyData */:
                return this.parseBackendKeyData(offset, length, bytes);
            case 69 /* MessageCodes.ErrorMessage */:
                return this.parseErrorMessage(offset, length, bytes, 'error');
            case 78 /* MessageCodes.NoticeMessage */:
                return this.parseErrorMessage(offset, length, bytes, 'notice');
            case 84 /* MessageCodes.RowDescriptionMessage */:
                return this.parseRowDescriptionMessage(offset, length, bytes);
            case 116 /* MessageCodes.ParameterDescriptionMessage */:
                return this.parseParameterDescriptionMessage(offset, length, bytes);
            case 71 /* MessageCodes.CopyIn */:
                return this.parseCopyInMessage(offset, length, bytes);
            case 72 /* MessageCodes.CopyOut */:
                return this.parseCopyOutMessage(offset, length, bytes);
            case 100 /* MessageCodes.CopyData */:
                return this.parseCopyData(offset, length, bytes);
            default:
                return new messages_1.DatabaseError('received invalid response: ' + code.toString(16), length, 'error');
        }
    }
    parseReadyForQueryMessage(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const status = this.reader.string(1);
        return new messages_1.ReadyForQueryMessage(length, status);
    }
    parseCommandCompleteMessage(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const text = this.reader.cstring();
        return new messages_1.CommandCompleteMessage(length, text);
    }
    parseCopyData(offset, length, bytes) {
        const chunk = bytes.slice(offset, offset + (length - 4));
        return new messages_1.CopyDataMessage(length, chunk);
    }
    parseCopyInMessage(offset, length, bytes) {
        return this.parseCopyMessage(offset, length, bytes, 'copyInResponse');
    }
    parseCopyOutMessage(offset, length, bytes) {
        return this.parseCopyMessage(offset, length, bytes, 'copyOutResponse');
    }
    parseCopyMessage(offset, length, bytes, messageName) {
        this.reader.setBuffer(offset, bytes);
        const isBinary = this.reader.byte() !== 0;
        const columnCount = this.reader.int16();
        const message = new messages_1.CopyResponse(length, messageName, isBinary, columnCount);
        for (let i = 0; i < columnCount; i++) {
            message.columnTypes[i] = this.reader.int16();
        }
        return message;
    }
    parseNotificationMessage(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const processId = this.reader.int32();
        const channel = this.reader.cstring();
        const payload = this.reader.cstring();
        return new messages_1.NotificationResponseMessage(length, processId, channel, payload);
    }
    parseRowDescriptionMessage(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const fieldCount = this.reader.int16();
        const message = new messages_1.RowDescriptionMessage(length, fieldCount);
        for (let i = 0; i < fieldCount; i++) {
            message.fields[i] = this.parseField();
        }
        return message;
    }
    parseField() {
        const name = this.reader.cstring();
        const tableID = this.reader.int32();
        const columnID = this.reader.int16();
        const dataTypeID = this.reader.int32();
        const dataTypeSize = this.reader.int16();
        const dataTypeModifier = this.reader.int32();
        const mode = this.reader.int16() === 0 ? 'text' : 'binary';
        return new messages_1.Field(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, mode);
    }
    parseParameterDescriptionMessage(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const parameterCount = this.reader.int16();
        const message = new messages_1.ParameterDescriptionMessage(length, parameterCount);
        for (let i = 0; i < parameterCount; i++) {
            message.dataTypeIDs[i] = this.reader.int32();
        }
        return message;
    }
    parseDataRowMessage(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const fieldCount = this.reader.int16();
        const fields = new Array(fieldCount);
        for (let i = 0; i < fieldCount; i++) {
            const len = this.reader.int32();
            // a -1 for length means the value of the field is null
            fields[i] = len === -1 ? null : this.reader.string(len);
        }
        return new messages_1.DataRowMessage(length, fields);
    }
    parseParameterStatusMessage(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const name = this.reader.cstring();
        const value = this.reader.cstring();
        return new messages_1.ParameterStatusMessage(length, name, value);
    }
    parseBackendKeyData(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const processID = this.reader.int32();
        const secretKey = this.reader.int32();
        return new messages_1.BackendKeyDataMessage(length, processID, secretKey);
    }
    parseAuthenticationResponse(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const code = this.reader.int32();
        // TODO(bmc): maybe better types here
        const message = {
            name: 'authenticationOk',
            length,
        };
        switch (code) {
            case 0: // AuthenticationOk
                break;
            case 3: // AuthenticationCleartextPassword
                if (message.length === 8) {
                    message.name = 'authenticationCleartextPassword';
                }
                break;
            case 5: // AuthenticationMD5Password
                if (message.length === 12) {
                    message.name = 'authenticationMD5Password';
                    const salt = this.reader.bytes(4);
                    return new messages_1.AuthenticationMD5Password(length, salt);
                }
                break;
            case 10: // AuthenticationSASL
                message.name = 'authenticationSASL';
                message.mechanisms = [];
                let mechanism;
                do {
                    mechanism = this.reader.cstring();
                    if (mechanism) {
                        message.mechanisms.push(mechanism);
                    }
                } while (mechanism);
                break;
            case 11: // AuthenticationSASLContinue
                message.name = 'authenticationSASLContinue';
                message.data = this.reader.string(length - 8);
                break;
            case 12: // AuthenticationSASLFinal
                message.name = 'authenticationSASLFinal';
                message.data = this.reader.string(length - 8);
                break;
            default:
                throw new Error('Unknown authenticationOk message type ' + code);
        }
        return message;
    }
    parseErrorMessage(offset, length, bytes, name) {
        this.reader.setBuffer(offset, bytes);
        const fields = {};
        let fieldType = this.reader.string(1);
        while (fieldType !== '\0') {
            fields[fieldType] = this.reader.cstring();
            fieldType = this.reader.string(1);
        }
        const messageValue = fields.M;
        const message = name === 'notice' ? new messages_1.NoticeMessage(length, messageValue) : new messages_1.DatabaseError(messageValue, length, name);
        message.severity = fields.S;
        message.code = fields.C;
        message.detail = fields.D;
        message.hint = fields.H;
        message.position = fields.P;
        message.internalPosition = fields.p;
        message.internalQuery = fields.q;
        message.where = fields.W;
        message.schema = fields.s;
        message.table = fields.t;
        message.column = fields.c;
        message.dataType = fields.d;
        message.constraint = fields.n;
        message.file = fields.F;
        message.line = fields.L;
        message.routine = fields.R;
        return message;
    }
}
exports.Parser = Parser;
//# sourceMappingURL=parser.js.map