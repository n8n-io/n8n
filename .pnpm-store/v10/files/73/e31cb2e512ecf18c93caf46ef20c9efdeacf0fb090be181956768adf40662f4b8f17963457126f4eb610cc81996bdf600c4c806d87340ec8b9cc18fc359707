"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
exports.LroEngine = void 0;
const operation_js_1 = require("./operation.js");
const constants_js_1 = require("../../poller/constants.js");
const poller_js_1 = require("../poller.js");
const operation_js_2 = require("../../poller/operation.js");
/**
 * The LRO Engine, a class that performs polling.
 */
class LroEngine extends poller_js_1.Poller {
    constructor(lro, options) {
        const { intervalInMs = constants_js_1.POLL_INTERVAL_IN_MS, resumeFrom, resolveOnUnsuccessful = false, isDone, lroResourceLocationConfig, processResult, updateState, } = options || {};
        const state = resumeFrom
            ? (0, operation_js_2.deserializeState)(resumeFrom)
            : {};
        const operation = new operation_js_1.GenericPollOperation(state, lro, !resolveOnUnsuccessful, lroResourceLocationConfig, processResult, updateState, isDone);
        super(operation);
        this.resolveOnUnsuccessful = resolveOnUnsuccessful;
        this.config = { intervalInMs: intervalInMs };
        operation.setPollerConfig(this.config);
    }
    /**
     * The method used by the poller to wait before attempting to update its operation.
     */
    delay() {
        return new Promise((resolve) => setTimeout(() => resolve(), this.config.intervalInMs));
    }
}
exports.LroEngine = LroEngine;
//# sourceMappingURL=lroEngine.js.map