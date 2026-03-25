"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const evaluate_1 = require("../evaluate");
const setupMetricsApi = () => {
    const fakeMetricsAlignment = jest
        .fn()
        .mockImplementation(() => Promise.resolve({}));
    const MAP = {
        metricsAlignment: fakeMetricsAlignment,
    };
    return MAP;
};
describe('AssistantCtrlPlane', () => {
    let metricsApi;
    beforeAll(() => {
        metricsApi = setupMetricsApi();
    });
    describe('evaluate', () => {
        test('throws error when empty strings are provided', async () => {
            const emptyRequests = [
                {
                    question: '',
                    answer: 'test-answer',
                    groundTruth: 'test-ground-truth',
                },
                {
                    question: 'test-question',
                    answer: '',
                    groundTruth: 'test-ground-truth',
                },
                {
                    question: 'test-question',
                    answer: 'test-answer',
                    groundTruth: '',
                },
            ];
            for (const request of emptyRequests) {
                await expect((0, evaluate_1.evaluate)(metricsApi)(request)).rejects.toThrow('Invalid input. Question, answer, and groundTruth must be non-empty strings.');
            }
        });
    });
});
//# sourceMappingURL=evaluate.test.js.map