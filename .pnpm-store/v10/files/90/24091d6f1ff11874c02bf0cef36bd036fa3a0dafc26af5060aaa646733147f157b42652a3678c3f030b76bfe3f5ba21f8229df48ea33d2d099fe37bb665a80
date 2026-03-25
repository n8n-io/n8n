"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const createAssistant_1 = require("../createAssistant");
const setupManageAssistantsApi = () => {
    const fakeCreateAssistant = jest
        .fn()
        .mockImplementation(() => Promise.resolve({}));
    const MAP = {
        createAssistant: fakeCreateAssistant,
    };
    return MAP;
};
describe('AssistantCtrlPlane', () => {
    let manageAssistantsApi;
    beforeEach(() => {
        manageAssistantsApi = setupManageAssistantsApi();
    });
    describe('createAssistant', () => {
        test('throws error when invalid region is provided', async () => {
            const invalidRequest = {
                name: 'test-assistant',
                region: 'invalid-region',
            };
            await expect((0, createAssistant_1.createAssistant)(manageAssistantsApi)(invalidRequest)).rejects.toThrow('Invalid region specified. Must be one of "us" or "eu"');
        });
        test('accepts valid regions in different cases', async () => {
            const validRequests = [
                {
                    name: 'test-assistant-1',
                    region: 'US',
                },
                {
                    name: 'test-assistant-2',
                    region: 'eu',
                },
            ];
            for (const request of validRequests) {
                await expect((0, createAssistant_1.createAssistant)(manageAssistantsApi)(request)).resolves.not.toThrow();
            }
        });
    });
});
//# sourceMappingURL=createAssistant.test.js.map