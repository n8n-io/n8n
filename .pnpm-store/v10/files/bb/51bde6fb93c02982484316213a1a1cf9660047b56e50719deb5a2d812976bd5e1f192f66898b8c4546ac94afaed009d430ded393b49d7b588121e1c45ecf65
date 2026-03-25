export const validateWaiterOptions = (options) => {
    if (options.maxWaitTime <= 0) {
        throw new Error(`WaiterConfiguration.maxWaitTime must be greater than 0`);
    }
    else if (options.minDelay <= 0) {
        throw new Error(`WaiterConfiguration.minDelay must be greater than 0`);
    }
    else if (options.maxDelay <= 0) {
        throw new Error(`WaiterConfiguration.maxDelay must be greater than 0`);
    }
    else if (options.maxWaitTime <= options.minDelay) {
        throw new Error(`WaiterConfiguration.maxWaitTime [${options.maxWaitTime}] must be greater than WaiterConfiguration.minDelay [${options.minDelay}] for this waiter`);
    }
    else if (options.maxDelay < options.minDelay) {
        throw new Error(`WaiterConfiguration.maxDelay [${options.maxDelay}] must be greater than WaiterConfiguration.minDelay [${options.minDelay}] for this waiter`);
    }
};
