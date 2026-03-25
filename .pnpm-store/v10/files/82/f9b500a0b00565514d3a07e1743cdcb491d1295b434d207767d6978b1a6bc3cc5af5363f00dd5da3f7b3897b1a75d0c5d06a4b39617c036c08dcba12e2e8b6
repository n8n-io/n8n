"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stream_1 = require("stream");
const chatStream_1 = require("../../assistant/chatStream");
const convertKeys_1 = require("../convertKeys");
jest.mock('../convertKeys');
describe('ChatStream', () => {
    let convertKeysMock;
    beforeEach(() => {
        convertKeysMock = convertKeys_1.convertKeysToCamelCase;
        convertKeysMock.mockImplementation((json) => json);
    });
    test('yields converted JSON from data stream chunks', async () => {
        const stream = stream_1.Readable.from([
            'data: {"key": "value"}\n',
            'data: {"key2": "value2"}\n',
        ]);
        const chatStream = new chatStream_1.ChatStream(stream);
        const chunks = [];
        for await (const chunk of chatStream) {
            chunks.push(chunk);
        }
        expect(chunks).toEqual([{ key: 'value' }, { key2: 'value2' }]);
        expect(chunks.length).toBe(2);
        expect(convertKeysMock).toHaveBeenCalledTimes(2);
    });
    test('skips malformed chunks', async () => {
        const stream = stream_1.Readable.from([
            'data: {"key": "value"}\n',
            'nothing_wrong\n',
            'data: {"key2": "value2"}\n',
        ]);
        const chatStream = new chatStream_1.ChatStream(stream);
        const chunks = [];
        for await (const chunk of chatStream) {
            chunks.push(chunk);
        }
        expect(chunks).toEqual([{ key: 'value' }, { key2: 'value2' }]);
        expect(chunks.length).toBe(2);
        expect(convertKeysMock).toHaveBeenCalledTimes(2);
    });
    test('skips malformed JSON', async () => {
        const stream = stream_1.Readable.from([
            'data: {"key": "value"}\n',
            'data: malformed_json\n',
            'data: {"key3": "value3"}\n',
        ]);
        const chatStream = new chatStream_1.ChatStream(stream);
        const chunks = [];
        for await (const chunk of chatStream) {
            chunks.push(chunk);
        }
        expect(chunks).toEqual([{ key: 'value' }, { key3: 'value3' }]);
        expect(chunks.length).toBe(2);
        expect(convertKeysMock).toHaveBeenCalledTimes(2);
    });
});
//# sourceMappingURL=chatStream.test.js.map