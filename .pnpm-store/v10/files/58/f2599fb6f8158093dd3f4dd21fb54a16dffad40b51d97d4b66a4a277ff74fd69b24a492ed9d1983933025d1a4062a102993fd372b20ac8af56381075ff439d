// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { GenericPollOperation } from "./operation";
import { POLL_INTERVAL_IN_MS } from "../../poller/constants";
import { Poller } from "../poller";
import { deserializeState } from "../../poller/operation";
/**
 * The LRO Engine, a class that performs polling.
 */
export class LroEngine extends Poller {
    constructor(lro, options) {
        const { intervalInMs = POLL_INTERVAL_IN_MS, resumeFrom, resolveOnUnsuccessful = false, isDone, lroResourceLocationConfig, processResult, updateState, } = options || {};
        const state = resumeFrom
            ? deserializeState(resumeFrom)
            : {};
        const operation = new GenericPollOperation(state, lro, !resolveOnUnsuccessful, lroResourceLocationConfig, processResult, updateState, isDone);
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
//# sourceMappingURL=lroEngine.js.map