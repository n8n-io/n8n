"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require(".");
describe('getGlobal()', () => {
    it('should return true if Buffer is present in globalThis', () => {
        expect((0, _1.getGlobal)().Buffer).toBe(true);
    });
    it('should return false if Buffer is not present in globalThis', () => {
        const bufferImp = global.Buffer;
        delete global.Buffer;
        expect((0, _1.getGlobal)().Buffer).toBe(false);
        global.Buffer = bufferImp;
    });
});
//# sourceMappingURL=get-global.util.spect.js.map