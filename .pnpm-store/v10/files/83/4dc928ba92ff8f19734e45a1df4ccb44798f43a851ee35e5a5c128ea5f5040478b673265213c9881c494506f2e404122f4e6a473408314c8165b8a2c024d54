"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericPollOperation = void 0;
const operation_js_1 = require("../../http/operation.js");
const logger_js_1 = require("../../logger.js");
const createStateProxy = () => ({
    initState: (config) => ({ config, isStarted: true }),
    setCanceled: (state) => (state.isCancelled = true),
    setError: (state, error) => (state.error = error),
    setResult: (state, result) => (state.result = result),
    setRunning: (state) => (state.isStarted = true),
    setSucceeded: (state) => (state.isCompleted = true),
    setFailed: () => {
        /** empty body */
    },
    getError: (state) => state.error,
    getResult: (state) => state.result,
    isCanceled: (state) => !!state.isCancelled,
    isFailed: (state) => !!state.error,
    isRunning: (state) => !!state.isStarted,
    isSucceeded: (state) => Boolean(state.isCompleted && !state.isCancelled && !state.error),
});
class GenericPollOperation {
    constructor(state, lro, setErrorAsResult, lroResourceLocationConfig, processResult, updateState, isDone) {
        this.state = state;
        this.lro = lro;
        this.setErrorAsResult = setErrorAsResult;
        this.lroResourceLocationConfig = lroResourceLocationConfig;
        this.processResult = processResult;
        this.updateState = updateState;
        this.isDone = isDone;
    }
    setPollerConfig(pollerConfig) {
        this.pollerConfig = pollerConfig;
    }
    async update(options) {
        var _a;
        const stateProxy = createStateProxy();
        if (!this.state.isStarted) {
            this.state = Object.assign(Object.assign({}, this.state), (await (0, operation_js_1.initHttpOperation)({
                lro: this.lro,
                stateProxy,
                resourceLocationConfig: this.lroResourceLocationConfig,
                processResult: this.processResult,
                setErrorAsResult: this.setErrorAsResult,
            })));
        }
        const updateState = this.updateState;
        const isDone = this.isDone;
        if (!this.state.isCompleted && this.state.error === undefined) {
            await (0, operation_js_1.pollHttpOperation)({
                lro: this.lro,
                state: this.state,
                stateProxy,
                processResult: this.processResult,
                updateState: updateState
                    ? (state, { rawResponse }) => updateState(state, rawResponse)
                    : undefined,
                isDone: isDone
                    ? ({ flatResponse }, state) => isDone(flatResponse, state)
                    : undefined,
                options,
                setDelay: (intervalInMs) => {
                    this.pollerConfig.intervalInMs = intervalInMs;
                },
                setErrorAsResult: this.setErrorAsResult,
            });
        }
        (_a = options === null || options === void 0 ? void 0 : options.fireProgress) === null || _a === void 0 ? void 0 : _a.call(options, this.state);
        return this;
    }
    async cancel() {
        logger_js_1.logger.error("`cancelOperation` is deprecated because it wasn't implemented");
        return this;
    }
    /**
     * Serializes the Poller operation.
     */
    toString() {
        return JSON.stringify({
            state: this.state,
        });
    }
}
exports.GenericPollOperation = GenericPollOperation;
//# sourceMappingURL=operation.js.map