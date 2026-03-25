const scheduledIntervalIdentifiers = new Map();
const scheduledTimeoutIdentifiers = new Map();
export const clearScheduledInterval = (timerId) => {
    const identifier = scheduledIntervalIdentifiers.get(timerId);
    if (identifier !== undefined) {
        clearTimeout(identifier);
        scheduledIntervalIdentifiers.delete(timerId);
    }
    else {
        throw new Error(`There is no interval scheduled with the given id "${timerId}".`);
    }
};
export const clearScheduledTimeout = (timerId) => {
    const identifier = scheduledTimeoutIdentifiers.get(timerId);
    if (identifier !== undefined) {
        clearTimeout(identifier);
        scheduledTimeoutIdentifiers.delete(timerId);
    }
    else {
        throw new Error(`There is no timeout scheduled with the given id "${timerId}".`);
    }
};
const computeDelayAndExpectedCallbackTime = (delay, nowInMainThread) => {
    let now;
    let remainingDelay;
    const nowInWorker = performance.now();
    const elapsed = Math.max(0, nowInWorker - nowInMainThread);
    now = nowInWorker;
    remainingDelay = delay - elapsed;
    const expected = now + remainingDelay;
    return { expected, remainingDelay };
};
const setTimeoutCallback = (identifiers, timerId, expected, timerType) => {
    const now = performance.now();
    if (now > expected) {
        postMessage({ id: null, method: 'call', params: { timerId, timerType } });
    }
    else {
        identifiers.set(timerId, setTimeout(setTimeoutCallback, expected - now, identifiers, timerId, expected, timerType));
    }
};
export const scheduleInterval = (delay, timerId, nowInMainThread) => {
    const { expected, remainingDelay } = computeDelayAndExpectedCallbackTime(delay, nowInMainThread);
    scheduledIntervalIdentifiers.set(timerId, setTimeout(setTimeoutCallback, remainingDelay, scheduledIntervalIdentifiers, timerId, expected, 'interval'));
};
export const scheduleTimeout = (delay, timerId, nowInMainThread) => {
    const { expected, remainingDelay } = computeDelayAndExpectedCallbackTime(delay, nowInMainThread);
    scheduledTimeoutIdentifiers.set(timerId, setTimeout(setTimeoutCallback, remainingDelay, scheduledTimeoutIdentifiers, timerId, expected, 'timeout'));
};
//# sourceMappingURL=timer.js.map