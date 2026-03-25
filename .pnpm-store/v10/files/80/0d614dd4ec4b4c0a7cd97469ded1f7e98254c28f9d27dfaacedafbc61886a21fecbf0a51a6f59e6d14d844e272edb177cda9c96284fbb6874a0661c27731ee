"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const serializer_1 = require("./serializer");
const buffer_list_1 = __importDefault(require("./testing/buffer-list"));
describe('serializer', () => {
    it('builds startup message', function () {
        const actual = serializer_1.serialize.startup({
            user: 'brian',
            database: 'bang',
        });
        assert_1.default.deepEqual(actual, new buffer_list_1.default()
            .addInt16(3)
            .addInt16(0)
            .addCString('user')
            .addCString('brian')
            .addCString('database')
            .addCString('bang')
            .addCString('client_encoding')
            .addCString('UTF8')
            .addCString('')
            .join(true));
    });
    it('builds password message', function () {
        const actual = serializer_1.serialize.password('!');
        assert_1.default.deepEqual(actual, new buffer_list_1.default().addCString('!').join(true, 'p'));
    });
    it('builds request ssl message', function () {
        const actual = serializer_1.serialize.requestSsl();
        const expected = new buffer_list_1.default().addInt32(80877103).join(true);
        assert_1.default.deepEqual(actual, expected);
    });
    it('builds SASLInitialResponseMessage message', function () {
        const actual = serializer_1.serialize.sendSASLInitialResponseMessage('mech', 'data');
        assert_1.default.deepEqual(actual, new buffer_list_1.default().addCString('mech').addInt32(4).addString('data').join(true, 'p'));
    });
    it('builds SCRAMClientFinalMessage message', function () {
        const actual = serializer_1.serialize.sendSCRAMClientFinalMessage('data');
        assert_1.default.deepEqual(actual, new buffer_list_1.default().addString('data').join(true, 'p'));
    });
    it('builds query message', function () {
        const txt = 'select * from boom';
        const actual = serializer_1.serialize.query(txt);
        assert_1.default.deepEqual(actual, new buffer_list_1.default().addCString(txt).join(true, 'Q'));
    });
    describe('parse message', () => {
        it('builds parse message', function () {
            const actual = serializer_1.serialize.parse({ text: '!' });
            const expected = new buffer_list_1.default().addCString('').addCString('!').addInt16(0).join(true, 'P');
            assert_1.default.deepEqual(actual, expected);
        });
        it('builds parse message with named query', function () {
            const actual = serializer_1.serialize.parse({
                name: 'boom',
                text: 'select * from boom',
                types: [],
            });
            const expected = new buffer_list_1.default().addCString('boom').addCString('select * from boom').addInt16(0).join(true, 'P');
            assert_1.default.deepEqual(actual, expected);
        });
        it('with multiple parameters', function () {
            const actual = serializer_1.serialize.parse({
                name: 'force',
                text: 'select * from bang where name = $1',
                types: [1, 2, 3, 4],
            });
            const expected = new buffer_list_1.default()
                .addCString('force')
                .addCString('select * from bang where name = $1')
                .addInt16(4)
                .addInt32(1)
                .addInt32(2)
                .addInt32(3)
                .addInt32(4)
                .join(true, 'P');
            assert_1.default.deepEqual(actual, expected);
        });
    });
    describe('bind messages', function () {
        it('with no values', function () {
            const actual = serializer_1.serialize.bind();
            const expectedBuffer = new buffer_list_1.default()
                .addCString('')
                .addCString('')
                .addInt16(0)
                .addInt16(0)
                .addInt16(1)
                .addInt16(0)
                .join(true, 'B');
            assert_1.default.deepEqual(actual, expectedBuffer);
        });
        it('with named statement, portal, and values', function () {
            const actual = serializer_1.serialize.bind({
                portal: 'bang',
                statement: 'woo',
                values: ['1', 'hi', null, 'zing'],
            });
            const expectedBuffer = new buffer_list_1.default()
                .addCString('bang') // portal name
                .addCString('woo') // statement name
                .addInt16(4)
                .addInt16(0)
                .addInt16(0)
                .addInt16(0)
                .addInt16(0)
                .addInt16(4)
                .addInt32(1)
                .add(Buffer.from('1'))
                .addInt32(2)
                .add(Buffer.from('hi'))
                .addInt32(-1)
                .addInt32(4)
                .add(Buffer.from('zing'))
                .addInt16(1)
                .addInt16(0)
                .join(true, 'B');
            assert_1.default.deepEqual(actual, expectedBuffer);
        });
    });
    it('with custom valueMapper', function () {
        const actual = serializer_1.serialize.bind({
            portal: 'bang',
            statement: 'woo',
            values: ['1', 'hi', null, 'zing'],
            valueMapper: () => null,
        });
        const expectedBuffer = new buffer_list_1.default()
            .addCString('bang') // portal name
            .addCString('woo') // statement name
            .addInt16(4)
            .addInt16(0)
            .addInt16(0)
            .addInt16(0)
            .addInt16(0)
            .addInt16(4)
            .addInt32(-1)
            .addInt32(-1)
            .addInt32(-1)
            .addInt32(-1)
            .addInt16(1)
            .addInt16(0)
            .join(true, 'B');
        assert_1.default.deepEqual(actual, expectedBuffer);
    });
    it('with named statement, portal, and buffer value', function () {
        const actual = serializer_1.serialize.bind({
            portal: 'bang',
            statement: 'woo',
            values: ['1', 'hi', null, Buffer.from('zing', 'utf8')],
        });
        const expectedBuffer = new buffer_list_1.default()
            .addCString('bang') // portal name
            .addCString('woo') // statement name
            .addInt16(4) // value count
            .addInt16(0) // string
            .addInt16(0) // string
            .addInt16(0) // string
            .addInt16(1) // binary
            .addInt16(4)
            .addInt32(1)
            .add(Buffer.from('1'))
            .addInt32(2)
            .add(Buffer.from('hi'))
            .addInt32(-1)
            .addInt32(4)
            .add(Buffer.from('zing', 'utf-8'))
            .addInt16(1)
            .addInt16(0)
            .join(true, 'B');
        assert_1.default.deepEqual(actual, expectedBuffer);
    });
    describe('builds execute message', function () {
        it('for unamed portal with no row limit', function () {
            const actual = serializer_1.serialize.execute();
            const expectedBuffer = new buffer_list_1.default().addCString('').addInt32(0).join(true, 'E');
            assert_1.default.deepEqual(actual, expectedBuffer);
        });
        it('for named portal with row limit', function () {
            const actual = serializer_1.serialize.execute({
                portal: 'my favorite portal',
                rows: 100,
            });
            const expectedBuffer = new buffer_list_1.default().addCString('my favorite portal').addInt32(100).join(true, 'E');
            assert_1.default.deepEqual(actual, expectedBuffer);
        });
    });
    it('builds flush command', function () {
        const actual = serializer_1.serialize.flush();
        const expected = new buffer_list_1.default().join(true, 'H');
        assert_1.default.deepEqual(actual, expected);
    });
    it('builds sync command', function () {
        const actual = serializer_1.serialize.sync();
        const expected = new buffer_list_1.default().join(true, 'S');
        assert_1.default.deepEqual(actual, expected);
    });
    it('builds end command', function () {
        const actual = serializer_1.serialize.end();
        const expected = Buffer.from([0x58, 0, 0, 0, 4]);
        assert_1.default.deepEqual(actual, expected);
    });
    describe('builds describe command', function () {
        it('describe statement', function () {
            const actual = serializer_1.serialize.describe({ type: 'S', name: 'bang' });
            const expected = new buffer_list_1.default().addChar('S').addCString('bang').join(true, 'D');
            assert_1.default.deepEqual(actual, expected);
        });
        it('describe unnamed portal', function () {
            const actual = serializer_1.serialize.describe({ type: 'P' });
            const expected = new buffer_list_1.default().addChar('P').addCString('').join(true, 'D');
            assert_1.default.deepEqual(actual, expected);
        });
    });
    describe('builds close command', function () {
        it('describe statement', function () {
            const actual = serializer_1.serialize.close({ type: 'S', name: 'bang' });
            const expected = new buffer_list_1.default().addChar('S').addCString('bang').join(true, 'C');
            assert_1.default.deepEqual(actual, expected);
        });
        it('describe unnamed portal', function () {
            const actual = serializer_1.serialize.close({ type: 'P' });
            const expected = new buffer_list_1.default().addChar('P').addCString('').join(true, 'C');
            assert_1.default.deepEqual(actual, expected);
        });
    });
    describe('copy messages', function () {
        it('builds copyFromChunk', () => {
            const actual = serializer_1.serialize.copyData(Buffer.from([1, 2, 3]));
            const expected = new buffer_list_1.default().add(Buffer.from([1, 2, 3])).join(true, 'd');
            assert_1.default.deepEqual(actual, expected);
        });
        it('builds copy fail', () => {
            const actual = serializer_1.serialize.copyFail('err!');
            const expected = new buffer_list_1.default().addCString('err!').join(true, 'f');
            assert_1.default.deepEqual(actual, expected);
        });
        it('builds copy done', () => {
            const actual = serializer_1.serialize.copyDone();
            const expected = new buffer_list_1.default().join(true, 'c');
            assert_1.default.deepEqual(actual, expected);
        });
    });
    it('builds cancel message', () => {
        const actual = serializer_1.serialize.cancel(3, 4);
        const expected = new buffer_list_1.default().addInt16(1234).addInt16(5678).addInt32(3).addInt32(4).join(true);
        assert_1.default.deepEqual(actual, expected);
    });
});
//# sourceMappingURL=outbound-serializer.test.js.map