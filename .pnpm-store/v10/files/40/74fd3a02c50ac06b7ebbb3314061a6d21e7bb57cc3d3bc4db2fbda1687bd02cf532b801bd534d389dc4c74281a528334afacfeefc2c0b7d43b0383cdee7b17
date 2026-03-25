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
// A placeholder for a `BackendMessage`’s length value that will be set after construction.
const LATEINIT_LENGTH = -1;
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
        const { reader } = this;
        // NOTE: This undesirably retains the buffer in `this.reader` if the `parse*Message` calls below throw. However, those should only throw in the case of a protocol error, which normally results in the reader being discarded.
        reader.setBuffer(offset, bytes);
        let message;
        switch (code) {
            case 50 /* MessageCodes.BindComplete */:
                message = messages_1.bindComplete;
                break;
            case 49 /* MessageCodes.ParseComplete */:
                message = messages_1.parseComplete;
                break;
            case 51 /* MessageCodes.CloseComplete */:
                message = messages_1.closeComplete;
                break;
            case 110 /* MessageCodes.NoData */:
                message = messages_1.noData;
                break;
            case 115 /* MessageCodes.PortalSuspended */:
                message = messages_1.portalSuspended;
                break;
            case 99 /* MessageCodes.CopyDone */:
                message = messages_1.copyDone;
                break;
            case 87 /* MessageCodes.ReplicationStart */:
                message = messages_1.replicationStart;
                break;
            case 73 /* MessageCodes.EmptyQuery */:
                message = messages_1.emptyQuery;
                break;
            case 68 /* MessageCodes.DataRow */:
                message = parseDataRowMessage(reader);
                break;
            case 67 /* MessageCodes.CommandComplete */:
                message = parseCommandCompleteMessage(reader);
                break;
            case 90 /* MessageCodes.ReadyForQuery */:
                message = parseReadyForQueryMessage(reader);
                break;
            case 65 /* MessageCodes.NotificationResponse */:
                message = parseNotificationMessage(reader);
                break;
            case 82 /* MessageCodes.AuthenticationResponse */:
                message = parseAuthenticationResponse(reader, length);
                break;
            case 83 /* MessageCodes.ParameterStatus */:
                message = parseParameterStatusMessage(reader);
                break;
            case 75 /* MessageCodes.BackendKeyData */:
                message = parseBackendKeyData(reader);
                break;
            case 69 /* MessageCodes.ErrorMessage */:
                message = parseErrorMessage(reader, 'error');
                break;
            case 78 /* MessageCodes.NoticeMessage */:
                message = parseErrorMessage(reader, 'notice');
                break;
            case 84 /* MessageCodes.RowDescriptionMessage */:
                message = parseRowDescriptionMessage(reader);
                break;
            case 116 /* MessageCodes.ParameterDescriptionMessage */:
                message = parseParameterDescriptionMessage(reader);
                break;
            case 71 /* MessageCodes.CopyIn */:
                message = parseCopyInMessage(reader);
                break;
            case 72 /* MessageCodes.CopyOut */:
                message = parseCopyOutMessage(reader);
                break;
            case 100 /* MessageCodes.CopyData */:
                message = parseCopyData(reader, length);
                break;
            default:
                return new messages_1.DatabaseError('received invalid response: ' + code.toString(16), length, 'error');
        }
        reader.setBuffer(0, emptyBuffer);
        message.length = length;
        return message;
    }
}
exports.Parser = Parser;
const parseReadyForQueryMessage = (reader) => {
    const status = reader.string(1);
    return new messages_1.ReadyForQueryMessage(LATEINIT_LENGTH, status);
};
const parseCommandCompleteMessage = (reader) => {
    const text = reader.cstring();
    return new messages_1.CommandCompleteMessage(LATEINIT_LENGTH, text);
};
const parseCopyData = (reader, length) => {
    const chunk = reader.bytes(length - 4);
    return new messages_1.CopyDataMessage(LATEINIT_LENGTH, chunk);
};
const parseCopyInMessage = (reader) => parseCopyMessage(reader, 'copyInResponse');
const parseCopyOutMessage = (reader) => parseCopyMessage(reader, 'copyOutResponse');
const parseCopyMessage = (reader, messageName) => {
    const isBinary = reader.byte() !== 0;
    const columnCount = reader.int16();
    const message = new messages_1.CopyResponse(LATEINIT_LENGTH, messageName, isBinary, columnCount);
    for (let i = 0; i < columnCount; i++) {
        message.columnTypes[i] = reader.int16();
    }
    return message;
};
const parseNotificationMessage = (reader) => {
    const processId = reader.int32();
    const channel = reader.cstring();
    const payload = reader.cstring();
    return new messages_1.NotificationResponseMessage(LATEINIT_LENGTH, processId, channel, payload);
};
const parseRowDescriptionMessage = (reader) => {
    const fieldCount = reader.int16();
    const message = new messages_1.RowDescriptionMessage(LATEINIT_LENGTH, fieldCount);
    for (let i = 0; i < fieldCount; i++) {
        message.fields[i] = parseField(reader);
    }
    return message;
};
const parseField = (reader) => {
    const name = reader.cstring();
    const tableID = reader.uint32();
    const columnID = reader.int16();
    const dataTypeID = reader.uint32();
    const dataTypeSize = reader.int16();
    const dataTypeModifier = reader.int32();
    const mode = reader.int16() === 0 ? 'text' : 'binary';
    return new messages_1.Field(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, mode);
};
const parseParameterDescriptionMessage = (reader) => {
    const parameterCount = reader.int16();
    const message = new messages_1.ParameterDescriptionMessage(LATEINIT_LENGTH, parameterCount);
    for (let i = 0; i < parameterCount; i++) {
        message.dataTypeIDs[i] = reader.int32();
    }
    return message;
};
const parseDataRowMessage = (reader) => {
    const fieldCount = reader.int16();
    const fields = new Array(fieldCount);
    for (let i = 0; i < fieldCount; i++) {
        const len = reader.int32();
        // a -1 for length means the value of the field is null
        fields[i] = len === -1 ? null : reader.string(len);
    }
    return new messages_1.DataRowMessage(LATEINIT_LENGTH, fields);
};
const parseParameterStatusMessage = (reader) => {
    const name = reader.cstring();
    const value = reader.cstring();
    return new messages_1.ParameterStatusMessage(LATEINIT_LENGTH, name, value);
};
const parseBackendKeyData = (reader) => {
    const processID = reader.int32();
    const secretKey = reader.int32();
    return new messages_1.BackendKeyDataMessage(LATEINIT_LENGTH, processID, secretKey);
};
const parseAuthenticationResponse = (reader, length) => {
    const code = reader.int32();
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
                const salt = reader.bytes(4);
                return new messages_1.AuthenticationMD5Password(LATEINIT_LENGTH, salt);
            }
            break;
        case 10: // AuthenticationSASL
            {
                message.name = 'authenticationSASL';
                message.mechanisms = [];
                let mechanism;
                do {
                    mechanism = reader.cstring();
                    if (mechanism) {
                        message.mechanisms.push(mechanism);
                    }
                } while (mechanism);
            }
            break;
        case 11: // AuthenticationSASLContinue
            message.name = 'authenticationSASLContinue';
            message.data = reader.string(length - 8);
            break;
        case 12: // AuthenticationSASLFinal
            message.name = 'authenticationSASLFinal';
            message.data = reader.string(length - 8);
            break;
        default:
            throw new Error('Unknown authenticationOk message type ' + code);
    }
    return message;
};
const parseErrorMessage = (reader, name) => {
    const fields = {};
    let fieldType = reader.string(1);
    while (fieldType !== '\0') {
        fields[fieldType] = reader.cstring();
        fieldType = reader.string(1);
    }
    const messageValue = fields.M;
    const message = name === 'notice'
        ? new messages_1.NoticeMessage(LATEINIT_LENGTH, messageValue)
        : new messages_1.DatabaseError(messageValue, LATEINIT_LENGTH, name);
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
};
//# sourceMappingURL=parser.js.map