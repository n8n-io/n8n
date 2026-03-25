"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluate = void 0;
const evaluate = (metricsApi) => {
    return async (options) => {
        if (options.question == '' ||
            options.answer == '' ||
            options.groundTruth == '') {
            throw new Error('Invalid input. Question, answer, and groundTruth must be non-empty strings.');
        }
        const request = {
            alignmentRequest: {
                question: options.question,
                answer: options.answer,
                groundTruthAnswer: options.groundTruth,
            },
        };
        return await metricsApi.metricsAlignment(request);
    };
};
exports.evaluate = evaluate;
//# sourceMappingURL=evaluate.js.map