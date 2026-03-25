"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock('fs');
//@ts-ignore
const fs_1 = require("fs");
const src_1 = require("../src");
describe(`exists`, () => {
    let statSync;
    let statSyncMock;
    let path;
    beforeEach(() => {
        path = `./path/${Math.random()}`;
        fs_1.addStatSyncMock(statSyncMock = jest.fn(() => statSync()));
    });
    afterEach(() => {
        fs_1.assertMocksUsed();
        statSync = statSyncMock = undefined;
    });
    describe('known errors', () => {
        beforeEach(() => givenStatSyncThrows({ code: 'ENOENT' }));
        it('with type', () => {
            expect(src_1.exists(path, src_1.READABLE)).toBe(false);
        });
        it('with type omitted', () => {
            expect(src_1.exists(path)).toBe(false);
        });
    });
    describe('unknown errors', () => {
        let err;
        beforeEach(() => err = givenStatSyncThrows(new Error('something')));
        it('with type', () => {
            expect(() => src_1.exists(path, src_1.READABLE)).toThrow(err);
        });
        it('with type omitted', () => {
            expect(() => src_1.exists(path)).toThrow(err);
        });
    });
    describe('path is a file', () => {
        beforeEach(() => givenStatSyncIsA('file'));
        existsReturns(true, false, true);
    });
    describe('path is a folder', () => {
        beforeEach(() => givenStatSyncIsA('folder'));
        existsReturns(false, true, true);
    });
    describe('path is unknown', () => {
        beforeEach(() => givenStatSyncIsA('unknown'));
        existsReturns(false, false, false);
    });
    function existsReturns(file, folder, readable) {
        it('when searching for a file', () => {
            expect(src_1.exists(path, src_1.FILE)).toBe(file);
        });
        it('when searching for a folder', () => {
            expect(src_1.exists(path, src_1.FOLDER)).toBe(folder);
        });
        it('when searching for either', () => {
            expect(src_1.exists(path, src_1.READABLE)).toBe(readable);
        });
        it('when searching without a type', () => {
            expect(src_1.exists(path)).toBe(readable);
        });
    }
    function givenStatSyncThrows(err) {
        statSync = () => { throw err; };
        return err;
    }
    function givenStatSyncIsA(type) {
        const mockStat = {
            isFile() { return type === 'file'; },
            isDirectory() { return type === 'folder'; },
        };
        statSync = () => mockStat;
        return mockStat;
    }
});
//# sourceMappingURL=exists.spec.js.map