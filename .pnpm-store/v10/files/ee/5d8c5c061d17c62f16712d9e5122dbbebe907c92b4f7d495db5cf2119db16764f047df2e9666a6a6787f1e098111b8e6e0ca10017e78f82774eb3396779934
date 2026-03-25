"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let statSyncMocks = [];
function statSync(...args) {
    const mock = statSyncMocks.shift();
    if (typeof mock !== 'function') {
        throw new Error(`fs.statSync called without configuring a mock`);
    }
    return mock(...args);
}
exports.statSync = statSync;
function addStatSyncMock(fn) {
    statSyncMocks.push(fn);
}
exports.addStatSyncMock = addStatSyncMock;
function assertMocksUsed() {
    if (statSyncMocks.length) {
        throw new Error(`fs.afterEach: statSync has ${statSyncMocks.length} unused mocks`);
    }
}
exports.assertMocksUsed = assertMocksUsed;
const mockFs = {
    statSync,
};
exports.default = mockFs;
//# sourceMappingURL=fs.js.map