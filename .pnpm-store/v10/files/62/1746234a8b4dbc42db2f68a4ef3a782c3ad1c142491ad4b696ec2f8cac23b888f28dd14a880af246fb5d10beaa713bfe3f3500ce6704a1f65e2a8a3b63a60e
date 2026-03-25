import { Observable } from '../Observable';
import { ColdObservable } from './ColdObservable';
import { HotObservable } from './HotObservable';
import { SubscriptionLog } from './SubscriptionLog';
import { VirtualTimeScheduler, VirtualAction } from '../scheduler/VirtualTimeScheduler';
import { COMPLETE_NOTIFICATION, errorNotification, nextNotification } from '../NotificationFactories';
import { dateTimestampProvider } from '../scheduler/dateTimestampProvider';
import { performanceTimestampProvider } from '../scheduler/performanceTimestampProvider';
import { animationFrameProvider } from '../scheduler/animationFrameProvider';
import { immediateProvider } from '../scheduler/immediateProvider';
import { intervalProvider } from '../scheduler/intervalProvider';
import { timeoutProvider } from '../scheduler/timeoutProvider';
const defaultMaxFrame = 750;
export class TestScheduler extends VirtualTimeScheduler {
    constructor(assertDeepEqual) {
        super(VirtualAction, defaultMaxFrame);
        this.assertDeepEqual = assertDeepEqual;
        this.hotObservables = [];
        this.coldObservables = [];
        this.flushTests = [];
        this.runMode = false;
    }
    createTime(marbles) {
        const indexOf = this.runMode ? marbles.trim().indexOf('|') : marbles.indexOf('|');
        if (indexOf === -1) {
            throw new Error('marble diagram for time should have a completion marker "|"');
        }
        return indexOf * TestScheduler.frameTimeFactor;
    }
    createColdObservable(marbles, values, error) {
        if (marbles.indexOf('^') !== -1) {
            throw new Error('cold observable cannot have subscription offset "^"');
        }
        if (marbles.indexOf('!') !== -1) {
            throw new Error('cold observable cannot have unsubscription marker "!"');
        }
        const messages = TestScheduler.parseMarbles(marbles, values, error, undefined, this.runMode);
        const cold = new ColdObservable(messages, this);
        this.coldObservables.push(cold);
        return cold;
    }
    createHotObservable(marbles, values, error) {
        if (marbles.indexOf('!') !== -1) {
            throw new Error('hot observable cannot have unsubscription marker "!"');
        }
        const messages = TestScheduler.parseMarbles(marbles, values, error, undefined, this.runMode);
        const subject = new HotObservable(messages, this);
        this.hotObservables.push(subject);
        return subject;
    }
    materializeInnerObservable(observable, outerFrame) {
        const messages = [];
        observable.subscribe({
            next: (value) => {
                messages.push({ frame: this.frame - outerFrame, notification: nextNotification(value) });
            },
            error: (error) => {
                messages.push({ frame: this.frame - outerFrame, notification: errorNotification(error) });
            },
            complete: () => {
                messages.push({ frame: this.frame - outerFrame, notification: COMPLETE_NOTIFICATION });
            },
        });
        return messages;
    }
    expectObservable(observable, subscriptionMarbles = null) {
        const actual = [];
        const flushTest = { actual, ready: false };
        const subscriptionParsed = TestScheduler.parseMarblesAsSubscriptions(subscriptionMarbles, this.runMode);
        const subscriptionFrame = subscriptionParsed.subscribedFrame === Infinity ? 0 : subscriptionParsed.subscribedFrame;
        const unsubscriptionFrame = subscriptionParsed.unsubscribedFrame;
        let subscription;
        this.schedule(() => {
            subscription = observable.subscribe({
                next: (x) => {
                    const value = x instanceof Observable ? this.materializeInnerObservable(x, this.frame) : x;
                    actual.push({ frame: this.frame, notification: nextNotification(value) });
                },
                error: (error) => {
                    actual.push({ frame: this.frame, notification: errorNotification(error) });
                },
                complete: () => {
                    actual.push({ frame: this.frame, notification: COMPLETE_NOTIFICATION });
                },
            });
        }, subscriptionFrame);
        if (unsubscriptionFrame !== Infinity) {
            this.schedule(() => subscription.unsubscribe(), unsubscriptionFrame);
        }
        this.flushTests.push(flushTest);
        const { runMode } = this;
        return {
            toBe(marbles, values, errorValue) {
                flushTest.ready = true;
                flushTest.expected = TestScheduler.parseMarbles(marbles, values, errorValue, true, runMode);
            },
            toEqual: (other) => {
                flushTest.ready = true;
                flushTest.expected = [];
                this.schedule(() => {
                    subscription = other.subscribe({
                        next: (x) => {
                            const value = x instanceof Observable ? this.materializeInnerObservable(x, this.frame) : x;
                            flushTest.expected.push({ frame: this.frame, notification: nextNotification(value) });
                        },
                        error: (error) => {
                            flushTest.expected.push({ frame: this.frame, notification: errorNotification(error) });
                        },
                        complete: () => {
                            flushTest.expected.push({ frame: this.frame, notification: COMPLETE_NOTIFICATION });
                        },
                    });
                }, subscriptionFrame);
            },
        };
    }
    expectSubscriptions(actualSubscriptionLogs) {
        const flushTest = { actual: actualSubscriptionLogs, ready: false };
        this.flushTests.push(flushTest);
        const { runMode } = this;
        return {
            toBe(marblesOrMarblesArray) {
                const marblesArray = typeof marblesOrMarblesArray === 'string' ? [marblesOrMarblesArray] : marblesOrMarblesArray;
                flushTest.ready = true;
                flushTest.expected = marblesArray
                    .map((marbles) => TestScheduler.parseMarblesAsSubscriptions(marbles, runMode))
                    .filter((marbles) => marbles.subscribedFrame !== Infinity);
            },
        };
    }
    flush() {
        const hotObservables = this.hotObservables;
        while (hotObservables.length > 0) {
            hotObservables.shift().setup();
        }
        super.flush();
        this.flushTests = this.flushTests.filter((test) => {
            if (test.ready) {
                this.assertDeepEqual(test.actual, test.expected);
                return false;
            }
            return true;
        });
    }
    static parseMarblesAsSubscriptions(marbles, runMode = false) {
        if (typeof marbles !== 'string') {
            return new SubscriptionLog(Infinity);
        }
        const characters = [...marbles];
        const len = characters.length;
        let groupStart = -1;
        let subscriptionFrame = Infinity;
        let unsubscriptionFrame = Infinity;
        let frame = 0;
        for (let i = 0; i < len; i++) {
            let nextFrame = frame;
            const advanceFrameBy = (count) => {
                nextFrame += count * this.frameTimeFactor;
            };
            const c = characters[i];
            switch (c) {
                case ' ':
                    if (!runMode) {
                        advanceFrameBy(1);
                    }
                    break;
                case '-':
                    advanceFrameBy(1);
                    break;
                case '(':
                    groupStart = frame;
                    advanceFrameBy(1);
                    break;
                case ')':
                    groupStart = -1;
                    advanceFrameBy(1);
                    break;
                case '^':
                    if (subscriptionFrame !== Infinity) {
                        throw new Error("found a second subscription point '^' in a " + 'subscription marble diagram. There can only be one.');
                    }
                    subscriptionFrame = groupStart > -1 ? groupStart : frame;
                    advanceFrameBy(1);
                    break;
                case '!':
                    if (unsubscriptionFrame !== Infinity) {
                        throw new Error("found a second unsubscription point '!' in a " + 'subscription marble diagram. There can only be one.');
                    }
                    unsubscriptionFrame = groupStart > -1 ? groupStart : frame;
                    break;
                default:
                    if (runMode && c.match(/^[0-9]$/)) {
                        if (i === 0 || characters[i - 1] === ' ') {
                            const buffer = characters.slice(i).join('');
                            const match = buffer.match(/^([0-9]+(?:\.[0-9]+)?)(ms|s|m) /);
                            if (match) {
                                i += match[0].length - 1;
                                const duration = parseFloat(match[1]);
                                const unit = match[2];
                                let durationInMs;
                                switch (unit) {
                                    case 'ms':
                                        durationInMs = duration;
                                        break;
                                    case 's':
                                        durationInMs = duration * 1000;
                                        break;
                                    case 'm':
                                        durationInMs = duration * 1000 * 60;
                                        break;
                                    default:
                                        break;
                                }
                                advanceFrameBy(durationInMs / this.frameTimeFactor);
                                break;
                            }
                        }
                    }
                    throw new Error("there can only be '^' and '!' markers in a " + "subscription marble diagram. Found instead '" + c + "'.");
            }
            frame = nextFrame;
        }
        if (unsubscriptionFrame < 0) {
            return new SubscriptionLog(subscriptionFrame);
        }
        else {
            return new SubscriptionLog(subscriptionFrame, unsubscriptionFrame);
        }
    }
    static parseMarbles(marbles, values, errorValue, materializeInnerObservables = false, runMode = false) {
        if (marbles.indexOf('!') !== -1) {
            throw new Error('conventional marble diagrams cannot have the ' + 'unsubscription marker "!"');
        }
        const characters = [...marbles];
        const len = characters.length;
        const testMessages = [];
        const subIndex = runMode ? marbles.replace(/^[ ]+/, '').indexOf('^') : marbles.indexOf('^');
        let frame = subIndex === -1 ? 0 : subIndex * -this.frameTimeFactor;
        const getValue = typeof values !== 'object'
            ? (x) => x
            : (x) => {
                if (materializeInnerObservables && values[x] instanceof ColdObservable) {
                    return values[x].messages;
                }
                return values[x];
            };
        let groupStart = -1;
        for (let i = 0; i < len; i++) {
            let nextFrame = frame;
            const advanceFrameBy = (count) => {
                nextFrame += count * this.frameTimeFactor;
            };
            let notification;
            const c = characters[i];
            switch (c) {
                case ' ':
                    if (!runMode) {
                        advanceFrameBy(1);
                    }
                    break;
                case '-':
                    advanceFrameBy(1);
                    break;
                case '(':
                    groupStart = frame;
                    advanceFrameBy(1);
                    break;
                case ')':
                    groupStart = -1;
                    advanceFrameBy(1);
                    break;
                case '|':
                    notification = COMPLETE_NOTIFICATION;
                    advanceFrameBy(1);
                    break;
                case '^':
                    advanceFrameBy(1);
                    break;
                case '#':
                    notification = errorNotification(errorValue || 'error');
                    advanceFrameBy(1);
                    break;
                default:
                    if (runMode && c.match(/^[0-9]$/)) {
                        if (i === 0 || characters[i - 1] === ' ') {
                            const buffer = characters.slice(i).join('');
                            const match = buffer.match(/^([0-9]+(?:\.[0-9]+)?)(ms|s|m) /);
                            if (match) {
                                i += match[0].length - 1;
                                const duration = parseFloat(match[1]);
                                const unit = match[2];
                                let durationInMs;
                                switch (unit) {
                                    case 'ms':
                                        durationInMs = duration;
                                        break;
                                    case 's':
                                        durationInMs = duration * 1000;
                                        break;
                                    case 'm':
                                        durationInMs = duration * 1000 * 60;
                                        break;
                                    default:
                                        break;
                                }
                                advanceFrameBy(durationInMs / this.frameTimeFactor);
                                break;
                            }
                        }
                    }
                    notification = nextNotification(getValue(c));
                    advanceFrameBy(1);
                    break;
            }
            if (notification) {
                testMessages.push({ frame: groupStart > -1 ? groupStart : frame, notification });
            }
            frame = nextFrame;
        }
        return testMessages;
    }
    createAnimator() {
        if (!this.runMode) {
            throw new Error('animate() must only be used in run mode');
        }
        let lastHandle = 0;
        let map;
        const delegate = {
            requestAnimationFrame(callback) {
                if (!map) {
                    throw new Error('animate() was not called within run()');
                }
                const handle = ++lastHandle;
                map.set(handle, callback);
                return handle;
            },
            cancelAnimationFrame(handle) {
                if (!map) {
                    throw new Error('animate() was not called within run()');
                }
                map.delete(handle);
            },
        };
        const animate = (marbles) => {
            if (map) {
                throw new Error('animate() must not be called more than once within run()');
            }
            if (/[|#]/.test(marbles)) {
                throw new Error('animate() must not complete or error');
            }
            map = new Map();
            const messages = TestScheduler.parseMarbles(marbles, undefined, undefined, undefined, true);
            for (const message of messages) {
                this.schedule(() => {
                    const now = this.now();
                    const callbacks = Array.from(map.values());
                    map.clear();
                    for (const callback of callbacks) {
                        callback(now);
                    }
                }, message.frame);
            }
        };
        return { animate, delegate };
    }
    createDelegates() {
        let lastHandle = 0;
        const scheduleLookup = new Map();
        const run = () => {
            const now = this.now();
            const scheduledRecords = Array.from(scheduleLookup.values());
            const scheduledRecordsDue = scheduledRecords.filter(({ due }) => due <= now);
            const dueImmediates = scheduledRecordsDue.filter(({ type }) => type === 'immediate');
            if (dueImmediates.length > 0) {
                const { handle, handler } = dueImmediates[0];
                scheduleLookup.delete(handle);
                handler();
                return;
            }
            const dueIntervals = scheduledRecordsDue.filter(({ type }) => type === 'interval');
            if (dueIntervals.length > 0) {
                const firstDueInterval = dueIntervals[0];
                const { duration, handler } = firstDueInterval;
                firstDueInterval.due = now + duration;
                firstDueInterval.subscription = this.schedule(run, duration);
                handler();
                return;
            }
            const dueTimeouts = scheduledRecordsDue.filter(({ type }) => type === 'timeout');
            if (dueTimeouts.length > 0) {
                const { handle, handler } = dueTimeouts[0];
                scheduleLookup.delete(handle);
                handler();
                return;
            }
            throw new Error('Expected a due immediate or interval');
        };
        const immediate = {
            setImmediate: (handler) => {
                const handle = ++lastHandle;
                scheduleLookup.set(handle, {
                    due: this.now(),
                    duration: 0,
                    handle,
                    handler,
                    subscription: this.schedule(run, 0),
                    type: 'immediate',
                });
                return handle;
            },
            clearImmediate: (handle) => {
                const value = scheduleLookup.get(handle);
                if (value) {
                    value.subscription.unsubscribe();
                    scheduleLookup.delete(handle);
                }
            },
        };
        const interval = {
            setInterval: (handler, duration = 0) => {
                const handle = ++lastHandle;
                scheduleLookup.set(handle, {
                    due: this.now() + duration,
                    duration,
                    handle,
                    handler,
                    subscription: this.schedule(run, duration),
                    type: 'interval',
                });
                return handle;
            },
            clearInterval: (handle) => {
                const value = scheduleLookup.get(handle);
                if (value) {
                    value.subscription.unsubscribe();
                    scheduleLookup.delete(handle);
                }
            },
        };
        const timeout = {
            setTimeout: (handler, duration = 0) => {
                const handle = ++lastHandle;
                scheduleLookup.set(handle, {
                    due: this.now() + duration,
                    duration,
                    handle,
                    handler,
                    subscription: this.schedule(run, duration),
                    type: 'timeout',
                });
                return handle;
            },
            clearTimeout: (handle) => {
                const value = scheduleLookup.get(handle);
                if (value) {
                    value.subscription.unsubscribe();
                    scheduleLookup.delete(handle);
                }
            },
        };
        return { immediate, interval, timeout };
    }
    run(callback) {
        const prevFrameTimeFactor = TestScheduler.frameTimeFactor;
        const prevMaxFrames = this.maxFrames;
        TestScheduler.frameTimeFactor = 1;
        this.maxFrames = Infinity;
        this.runMode = true;
        const animator = this.createAnimator();
        const delegates = this.createDelegates();
        animationFrameProvider.delegate = animator.delegate;
        dateTimestampProvider.delegate = this;
        immediateProvider.delegate = delegates.immediate;
        intervalProvider.delegate = delegates.interval;
        timeoutProvider.delegate = delegates.timeout;
        performanceTimestampProvider.delegate = this;
        const helpers = {
            cold: this.createColdObservable.bind(this),
            hot: this.createHotObservable.bind(this),
            flush: this.flush.bind(this),
            time: this.createTime.bind(this),
            expectObservable: this.expectObservable.bind(this),
            expectSubscriptions: this.expectSubscriptions.bind(this),
            animate: animator.animate,
        };
        try {
            const ret = callback(helpers);
            this.flush();
            return ret;
        }
        finally {
            TestScheduler.frameTimeFactor = prevFrameTimeFactor;
            this.maxFrames = prevMaxFrames;
            this.runMode = false;
            animationFrameProvider.delegate = undefined;
            dateTimestampProvider.delegate = undefined;
            immediateProvider.delegate = undefined;
            intervalProvider.delegate = undefined;
            timeoutProvider.delegate = undefined;
            performanceTimestampProvider.delegate = undefined;
        }
    }
}
TestScheduler.frameTimeFactor = 10;
//# sourceMappingURL=TestScheduler.js.map