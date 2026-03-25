import { getGlobal } from '.';
describe('getGlobal()', () => {
    it('should return true if Buffer is present in globalThis', () => {
        expect(getGlobal().Buffer).toBe(true);
    });
    it('should return false if Buffer is not present in globalThis', () => {
        const bufferImp = global.Buffer;
        delete global.Buffer;
        expect(getGlobal().Buffer).toBe(false);
        global.Buffer = bufferImp;
    });
});
//# sourceMappingURL=get-global.util.spect.js.map