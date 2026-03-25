"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_buffers_1 = __importDefault(require("./testing/test-buffers"));
const buffer_list_1 = __importDefault(require("./testing/buffer-list"));
const _1 = require(".");
const assert_1 = __importDefault(require("assert"));
const stream_1 = require("stream");
const parser_1 = require("./parser");
const authOkBuffer = test_buffers_1.default.authenticationOk();
const paramStatusBuffer = test_buffers_1.default.parameterStatus('client_encoding', 'UTF8');
const readyForQueryBuffer = test_buffers_1.default.readyForQuery();
const backendKeyDataBuffer = test_buffers_1.default.backendKeyData(1, 2);
const commandCompleteBuffer = test_buffers_1.default.commandComplete('SELECT 3');
const parseCompleteBuffer = test_buffers_1.default.parseComplete();
const bindCompleteBuffer = test_buffers_1.default.bindComplete();
const portalSuspendedBuffer = test_buffers_1.default.portalSuspended();
const row1 = {
    name: 'id',
    tableID: 1,
    attributeNumber: 2,
    dataTypeID: 3,
    dataTypeSize: 4,
    typeModifier: 5,
    formatCode: 0,
};
const oneRowDescBuff = test_buffers_1.default.rowDescription([row1]);
row1.name = 'bang';
const twoRowBuf = test_buffers_1.default.rowDescription([
    row1,
    {
        name: 'whoah',
        tableID: 10,
        attributeNumber: 11,
        dataTypeID: 12,
        dataTypeSize: 13,
        typeModifier: 14,
        formatCode: 0,
    },
]);
const rowWithBigOids = {
    name: 'bigoid',
    tableID: 3000000001,
    attributeNumber: 2,
    dataTypeID: 3000000003,
    dataTypeSize: 4,
    typeModifier: 5,
    formatCode: 0,
};
const bigOidDescBuff = test_buffers_1.default.rowDescription([rowWithBigOids]);
const emptyRowFieldBuf = test_buffers_1.default.dataRow([]);
const oneFieldBuf = test_buffers_1.default.dataRow(['test']);
const expectedAuthenticationOkayMessage = {
    name: 'authenticationOk',
    length: 8,
};
const expectedParameterStatusMessage = {
    name: 'parameterStatus',
    parameterName: 'client_encoding',
    parameterValue: 'UTF8',
    length: 25,
};
const expectedBackendKeyDataMessage = {
    name: 'backendKeyData',
    processID: 1,
    secretKey: 2,
};
const expectedReadyForQueryMessage = {
    name: 'readyForQuery',
    length: 5,
    status: 'I',
};
const expectedCommandCompleteMessage = {
    name: 'commandComplete',
    length: 13,
    text: 'SELECT 3',
};
const emptyRowDescriptionBuffer = new buffer_list_1.default()
    .addInt16(0) // number of fields
    .join(true, 'T');
const expectedEmptyRowDescriptionMessage = {
    name: 'rowDescription',
    length: 6,
    fieldCount: 0,
    fields: [],
};
const expectedOneRowMessage = {
    name: 'rowDescription',
    length: 27,
    fieldCount: 1,
    fields: [
        {
            name: 'id',
            tableID: 1,
            columnID: 2,
            dataTypeID: 3,
            dataTypeSize: 4,
            dataTypeModifier: 5,
            format: 'text',
        },
    ],
};
const expectedTwoRowMessage = {
    name: 'rowDescription',
    length: 53,
    fieldCount: 2,
    fields: [
        {
            name: 'bang',
            tableID: 1,
            columnID: 2,
            dataTypeID: 3,
            dataTypeSize: 4,
            dataTypeModifier: 5,
            format: 'text',
        },
        {
            name: 'whoah',
            tableID: 10,
            columnID: 11,
            dataTypeID: 12,
            dataTypeSize: 13,
            dataTypeModifier: 14,
            format: 'text',
        },
    ],
};
const expectedBigOidMessage = {
    name: 'rowDescription',
    length: 31,
    fieldCount: 1,
    fields: [
        {
            name: 'bigoid',
            tableID: 3000000001,
            columnID: 2,
            dataTypeID: 3000000003,
            dataTypeSize: 4,
            dataTypeModifier: 5,
            format: 'text',
        },
    ],
};
const emptyParameterDescriptionBuffer = new buffer_list_1.default()
    .addInt16(0) // number of parameters
    .join(true, 't');
const oneParameterDescBuf = test_buffers_1.default.parameterDescription([1111]);
const twoParameterDescBuf = test_buffers_1.default.parameterDescription([2222, 3333]);
const expectedEmptyParameterDescriptionMessage = {
    name: 'parameterDescription',
    length: 6,
    parameterCount: 0,
    dataTypeIDs: [],
};
const expectedOneParameterMessage = {
    name: 'parameterDescription',
    length: 10,
    parameterCount: 1,
    dataTypeIDs: [1111],
};
const expectedTwoParameterMessage = {
    name: 'parameterDescription',
    length: 14,
    parameterCount: 2,
    dataTypeIDs: [2222, 3333],
};
const testForMessage = function (buffer, expectedMessage) {
    it('receives and parses ' + expectedMessage.name, () => __awaiter(this, void 0, void 0, function* () {
        const messages = yield parseBuffers([buffer]);
        const [lastMessage] = messages;
        for (const key in expectedMessage) {
            assert_1.default.deepEqual(lastMessage[key], expectedMessage[key]);
        }
    }));
};
const plainPasswordBuffer = test_buffers_1.default.authenticationCleartextPassword();
const md5PasswordBuffer = test_buffers_1.default.authenticationMD5Password();
const SASLBuffer = test_buffers_1.default.authenticationSASL();
const SASLContinueBuffer = test_buffers_1.default.authenticationSASLContinue();
const SASLFinalBuffer = test_buffers_1.default.authenticationSASLFinal();
const expectedPlainPasswordMessage = {
    name: 'authenticationCleartextPassword',
};
const expectedMD5PasswordMessage = {
    name: 'authenticationMD5Password',
    salt: Buffer.from([1, 2, 3, 4]),
};
const expectedSASLMessage = {
    name: 'authenticationSASL',
    mechanisms: ['SCRAM-SHA-256'],
};
const expectedSASLContinueMessage = {
    name: 'authenticationSASLContinue',
    data: 'data',
};
const expectedSASLFinalMessage = {
    name: 'authenticationSASLFinal',
    data: 'data',
};
const notificationResponseBuffer = test_buffers_1.default.notification(4, 'hi', 'boom');
const expectedNotificationResponseMessage = {
    name: 'notification',
    processId: 4,
    channel: 'hi',
    payload: 'boom',
};
const parseBuffers = (buffers) => __awaiter(void 0, void 0, void 0, function* () {
    const stream = new stream_1.PassThrough();
    for (const buffer of buffers) {
        stream.write(buffer);
    }
    stream.end();
    const msgs = [];
    yield (0, _1.parse)(stream, (msg) => msgs.push(msg));
    return msgs;
});
describe('PgPacketStream', function () {
    testForMessage(authOkBuffer, expectedAuthenticationOkayMessage);
    testForMessage(plainPasswordBuffer, expectedPlainPasswordMessage);
    testForMessage(md5PasswordBuffer, expectedMD5PasswordMessage);
    testForMessage(SASLBuffer, expectedSASLMessage);
    testForMessage(SASLContinueBuffer, expectedSASLContinueMessage);
    // this exercises a found bug in the parser:
    // https://github.com/brianc/node-postgres/pull/2210#issuecomment-627626084
    // and adds a test which is deterministic, rather than relying on network packet chunking
    const extendedSASLContinueBuffer = Buffer.concat([SASLContinueBuffer, Buffer.from([1, 2, 3, 4])]);
    testForMessage(extendedSASLContinueBuffer, expectedSASLContinueMessage);
    testForMessage(SASLFinalBuffer, expectedSASLFinalMessage);
    // this exercises a found bug in the parser:
    // https://github.com/brianc/node-postgres/pull/2210#issuecomment-627626084
    // and adds a test which is deterministic, rather than relying on network packet chunking
    const extendedSASLFinalBuffer = Buffer.concat([SASLFinalBuffer, Buffer.from([1, 2, 4, 5])]);
    testForMessage(extendedSASLFinalBuffer, expectedSASLFinalMessage);
    testForMessage(paramStatusBuffer, expectedParameterStatusMessage);
    testForMessage(backendKeyDataBuffer, expectedBackendKeyDataMessage);
    testForMessage(readyForQueryBuffer, expectedReadyForQueryMessage);
    testForMessage(commandCompleteBuffer, expectedCommandCompleteMessage);
    testForMessage(notificationResponseBuffer, expectedNotificationResponseMessage);
    testForMessage(test_buffers_1.default.emptyQuery(), {
        name: 'emptyQuery',
        length: 4,
    });
    testForMessage(Buffer.from([0x6e, 0, 0, 0, 4]), {
        name: 'noData',
    });
    describe('rowDescription messages', function () {
        testForMessage(emptyRowDescriptionBuffer, expectedEmptyRowDescriptionMessage);
        testForMessage(oneRowDescBuff, expectedOneRowMessage);
        testForMessage(twoRowBuf, expectedTwoRowMessage);
        testForMessage(bigOidDescBuff, expectedBigOidMessage);
    });
    describe('parameterDescription messages', function () {
        testForMessage(emptyParameterDescriptionBuffer, expectedEmptyParameterDescriptionMessage);
        testForMessage(oneParameterDescBuf, expectedOneParameterMessage);
        testForMessage(twoParameterDescBuf, expectedTwoParameterMessage);
    });
    describe('parsing rows', function () {
        describe('parsing empty row', function () {
            testForMessage(emptyRowFieldBuf, {
                name: 'dataRow',
                fieldCount: 0,
            });
        });
        describe('parsing data row with fields', function () {
            testForMessage(oneFieldBuf, {
                name: 'dataRow',
                fieldCount: 1,
                fields: ['test'],
            });
        });
    });
    describe('notice message', function () {
        // this uses the same logic as error message
        const buff = test_buffers_1.default.notice([{ type: 'C', value: 'code' }]);
        testForMessage(buff, {
            name: 'notice',
            code: 'code',
        });
    });
    testForMessage(test_buffers_1.default.error([]), {
        name: 'error',
    });
    describe('with all the fields', function () {
        const buffer = test_buffers_1.default.error([
            {
                type: 'S',
                value: 'ERROR',
            },
            {
                type: 'C',
                value: 'code',
            },
            {
                type: 'M',
                value: 'message',
            },
            {
                type: 'D',
                value: 'details',
            },
            {
                type: 'H',
                value: 'hint',
            },
            {
                type: 'P',
                value: '100',
            },
            {
                type: 'p',
                value: '101',
            },
            {
                type: 'q',
                value: 'query',
            },
            {
                type: 'W',
                value: 'where',
            },
            {
                type: 'F',
                value: 'file',
            },
            {
                type: 'L',
                value: 'line',
            },
            {
                type: 'R',
                value: 'routine',
            },
            {
                type: 'Z',
                value: 'alsdkf',
            },
        ]);
        testForMessage(buffer, {
            name: 'error',
            severity: 'ERROR',
            code: 'code',
            message: 'message',
            detail: 'details',
            hint: 'hint',
            position: '100',
            internalPosition: '101',
            internalQuery: 'query',
            where: 'where',
            file: 'file',
            line: 'line',
            routine: 'routine',
        });
    });
    testForMessage(parseCompleteBuffer, {
        name: 'parseComplete',
    });
    testForMessage(bindCompleteBuffer, {
        name: 'bindComplete',
    });
    testForMessage(bindCompleteBuffer, {
        name: 'bindComplete',
    });
    testForMessage(test_buffers_1.default.closeComplete(), {
        name: 'closeComplete',
    });
    describe('parses portal suspended message', function () {
        testForMessage(portalSuspendedBuffer, {
            name: 'portalSuspended',
        });
    });
    describe('parses replication start message', function () {
        testForMessage(Buffer.from([0x57, 0x00, 0x00, 0x00, 0x04]), {
            name: 'replicationStart',
            length: 4,
        });
    });
    describe('copy', () => {
        testForMessage(test_buffers_1.default.copyIn(0), {
            name: 'copyInResponse',
            length: 7,
            binary: false,
            columnTypes: [],
        });
        testForMessage(test_buffers_1.default.copyIn(2), {
            name: 'copyInResponse',
            length: 11,
            binary: false,
            columnTypes: [0, 1],
        });
        testForMessage(test_buffers_1.default.copyOut(0), {
            name: 'copyOutResponse',
            length: 7,
            binary: false,
            columnTypes: [],
        });
        testForMessage(test_buffers_1.default.copyOut(3), {
            name: 'copyOutResponse',
            length: 13,
            binary: false,
            columnTypes: [0, 1, 2],
        });
        testForMessage(test_buffers_1.default.copyDone(), {
            name: 'copyDone',
            length: 4,
        });
        testForMessage(test_buffers_1.default.copyData(Buffer.from([5, 6, 7])), {
            name: 'copyData',
            length: 7,
            chunk: Buffer.from([5, 6, 7]),
        });
    });
    // since the data message on a stream can randomly divide the incomming
    // tcp packets anywhere, we need to make sure we can parse every single
    // split on a tcp message
    describe('split buffer, single message parsing', function () {
        const fullBuffer = test_buffers_1.default.dataRow([null, 'bang', 'zug zug', null, '!']);
        it('parses when full buffer comes in', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const messages = yield parseBuffers([fullBuffer]);
                const message = messages[0];
                assert_1.default.equal(message.fields.length, 5);
                assert_1.default.equal(message.fields[0], null);
                assert_1.default.equal(message.fields[1], 'bang');
                assert_1.default.equal(message.fields[2], 'zug zug');
                assert_1.default.equal(message.fields[3], null);
                assert_1.default.equal(message.fields[4], '!');
            });
        });
        const testMessageReceivedAfterSplitAt = function (split) {
            return __awaiter(this, void 0, void 0, function* () {
                const firstBuffer = Buffer.alloc(fullBuffer.length - split);
                const secondBuffer = Buffer.alloc(fullBuffer.length - firstBuffer.length);
                fullBuffer.copy(firstBuffer, 0, 0);
                fullBuffer.copy(secondBuffer, 0, firstBuffer.length);
                const messages = yield parseBuffers([firstBuffer, secondBuffer]);
                const message = messages[0];
                assert_1.default.equal(message.fields.length, 5);
                assert_1.default.equal(message.fields[0], null);
                assert_1.default.equal(message.fields[1], 'bang');
                assert_1.default.equal(message.fields[2], 'zug zug');
                assert_1.default.equal(message.fields[3], null);
                assert_1.default.equal(message.fields[4], '!');
            });
        };
        it('parses when split in the middle', function () {
            return testMessageReceivedAfterSplitAt(6);
        });
        it('parses when split at end', function () {
            return testMessageReceivedAfterSplitAt(2);
        });
        it('parses when split at beginning', function () {
            return Promise.all([
                testMessageReceivedAfterSplitAt(fullBuffer.length - 2),
                testMessageReceivedAfterSplitAt(fullBuffer.length - 1),
                testMessageReceivedAfterSplitAt(fullBuffer.length - 5),
            ]);
        });
    });
    describe('split buffer, multiple message parsing', function () {
        const dataRowBuffer = test_buffers_1.default.dataRow(['!']);
        const readyForQueryBuffer = test_buffers_1.default.readyForQuery();
        const fullBuffer = Buffer.alloc(dataRowBuffer.length + readyForQueryBuffer.length);
        dataRowBuffer.copy(fullBuffer, 0, 0);
        readyForQueryBuffer.copy(fullBuffer, dataRowBuffer.length, 0);
        const verifyMessages = function (messages) {
            assert_1.default.strictEqual(messages.length, 2);
            assert_1.default.deepEqual(messages[0], {
                name: 'dataRow',
                fieldCount: 1,
                length: 11,
                fields: ['!'],
            });
            assert_1.default.equal(messages[0].fields[0], '!');
            assert_1.default.deepEqual(messages[1], {
                name: 'readyForQuery',
                length: 5,
                status: 'I',
            });
        };
        // sanity check
        it('receives both messages when packet is not split', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const messages = yield parseBuffers([fullBuffer]);
                verifyMessages(messages);
            });
        });
        const splitAndVerifyTwoMessages = function (split) {
            return __awaiter(this, void 0, void 0, function* () {
                const firstBuffer = Buffer.alloc(fullBuffer.length - split);
                const secondBuffer = Buffer.alloc(fullBuffer.length - firstBuffer.length);
                fullBuffer.copy(firstBuffer, 0, 0);
                fullBuffer.copy(secondBuffer, 0, firstBuffer.length);
                const messages = yield parseBuffers([firstBuffer, secondBuffer]);
                verifyMessages(messages);
            });
        };
        describe('receives both messages when packet is split', function () {
            it('in the middle', function () {
                return splitAndVerifyTwoMessages(11);
            });
            it('at the front', function () {
                return Promise.all([
                    splitAndVerifyTwoMessages(fullBuffer.length - 1),
                    splitAndVerifyTwoMessages(fullBuffer.length - 4),
                    splitAndVerifyTwoMessages(fullBuffer.length - 6),
                ]);
            });
            it('at the end', function () {
                return Promise.all([splitAndVerifyTwoMessages(8), splitAndVerifyTwoMessages(1)]);
            });
        });
    });
    it('cleans up the reader after handling a packet', function () {
        const parser = new parser_1.Parser();
        parser.parse(oneFieldBuf, () => { });
        assert_1.default.strictEqual(parser.reader.buffer.byteLength, 0);
    });
});
//# sourceMappingURL=inbound-parser.test.js.map