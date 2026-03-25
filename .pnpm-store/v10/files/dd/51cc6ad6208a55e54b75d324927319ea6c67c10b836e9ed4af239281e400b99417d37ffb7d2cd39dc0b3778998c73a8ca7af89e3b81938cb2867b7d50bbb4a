export class StringEvaluator {
    constructor(params) {
        Object.defineProperty(this, "evaluationName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "inputKey", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "predictionKey", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "answerKey", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "gradingFunction", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.evaluationName = params.evaluationName;
        this.inputKey = params.inputKey ?? "input";
        this.predictionKey = params.predictionKey ?? "output";
        this.answerKey =
            params.answerKey !== undefined ? params.answerKey : "output";
        this.gradingFunction = params.gradingFunction;
    }
    async evaluateRun(run, example) {
        if (!run.outputs) {
            throw new Error("Run outputs cannot be undefined.");
        }
        const functionInputs = {
            input: run.inputs[this.inputKey],
            prediction: run.outputs[this.predictionKey],
            answer: this.answerKey ? example?.outputs?.[this.answerKey] : null,
        };
        const gradingResults = await this.gradingFunction(functionInputs);
        const key = gradingResults.key || this.evaluationName;
        if (!key) {
            throw new Error("Evaluation name cannot be undefined.");
        }
        return {
            key,
            score: gradingResults.score,
            value: gradingResults.value,
            comment: gradingResults.comment,
            correction: gradingResults.correction,
        };
    }
}
