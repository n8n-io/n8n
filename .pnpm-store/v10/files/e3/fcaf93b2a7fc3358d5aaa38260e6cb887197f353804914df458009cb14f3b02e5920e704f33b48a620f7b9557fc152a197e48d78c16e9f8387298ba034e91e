"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const debugLog_1 = require("../debugLog");
describe('debugLog', () => {
    let consoleLogSpy;
    beforeEach(() => {
        consoleLogSpy = jest
            .spyOn(console, 'log')
            .mockImplementation(() => jest.fn());
    });
    test('logs when PINECONE_DEBUG is true', () => {
        process.env.PINECONE_DEBUG = 'true';
        (0, debugLog_1.debugLog)('There was an error!');
        expect(consoleLogSpy).toHaveBeenCalledWith('There was an error!');
    });
    test('does not log when PINECONE_DEBUG is false', () => {
        delete process.env.PINECONE_DEBUG;
        (0, debugLog_1.debugLog)('There was an error!');
        expect(consoleLogSpy).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=debugLog.test.js.map