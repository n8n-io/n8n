import { __extends, __read, __spreadArray, __values } from "tslib";
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
var defaultMaxFrame = 750;
var TestScheduler = (function (_super) {
    __extends(TestScheduler, _super);
    function TestScheduler(assertDeepEqual) {
        var _this = _super.call(this, VirtualAction, defaultMaxFrame) || this;
        _this.assertDeepEqual = assertDeepEqual;
        _this.hotObservables = [];
        _this.coldObservables = [];
        _this.flushTests = [];
        _this.runMode = false;
        return _this;
    }
    TestScheduler.prototype.createTime = function (marbles) {
        var indexOf = this.runMode ? marbles.trim().indexOf('|') : marbles.indexOf('|');
        if (indexOf === -1) {
            throw new Error('marble diagram for time should have a completion marker "|"');
        }
        return indexOf * TestScheduler.frameTimeFactor;
    };
    TestScheduler.prototype.createColdObservable = function (marbles, values, error) {
        if (marbles.indexOf('^') !== -1) {
            throw new Error('cold observable cannot have subscription offset "^"');
        }
        if (marbles.indexOf('!') !== -1) {
            throw new Error('cold observable cannot have unsubscription marker "!"');
        }
        var messages = TestScheduler.parseMarbles(marbles, values, error, undefined, this.runMode);
        var cold = new ColdObservable(messages, this);
        this.coldObservables.push(cold);
        return cold;
    };
    TestScheduler.prototype.createHotObservable = function (marbles, values, error) {
        if (marbles.indexOf('!') !== -1) {
            throw new Error('hot observable cannot have unsubscription marker "!"');
        }
        var messages = TestScheduler.parseMarbles(marbles, values, error, undefined, this.runMode);
        var subject = new HotObservable(messages, this);
        this.hotObservables.push(subject);
        return subject;
    };
    TestScheduler.prototype.materializeInnerObservable = function (observable, outerFrame) {
        var _this = this;
        var messages = [];
        observable.subscribe({
            next: function (value) {
                messages.push({ frame: _this.frame - outerFrame, notification: nextNotification(value) });
            },
            error: function (error) {
                messages.push({ frame: _this.frame - outerFrame, notification: errorNotification(error) });
            },
            complete: function () {
                messages.push({ frame: _this.frame - outerFrame, notification: COMPLETE_NOTIFICATION });
            },
        });
        return messages;
    };
    TestScheduler.prototype.expectObservable = function (observable, subscriptionMarbles) {
        var _this = this;
        if (subscriptionMarbles === void 0) { subscriptionMarbles = null; }
        var actual = [];
        var flushTest = { actual: actual, ready: false };
        var subscriptionParsed = TestScheduler.parseMarblesAsSubscriptions(subscriptionMarbles, this.runMode);
        var subscriptionFrame = subscriptionParsed.subscribedFrame === Infinity ? 0 : subscriptionParsed.subscribedFrame;
        var unsubscriptionFrame = subscriptionParsed.unsubscribedFrame;
        var subscription;
        this.schedule(function () {
            subscription = observable.subscribe({
                next: function (x) {
                    var value = x instanceof Observable ? _this.materializeInnerObservable(x, _this.frame) : x;
                    actual.push({ frame: _this.frame, notification: nextNotification(value) });
                },
                error: function (error) {
                    actual.push({ frame: _this.frame, notification: errorNotification(error) });
                },
                complete: function () {
                    actual.push({ frame: _this.frame, notification: COMPLETE_NOTIFICATION });
                },
            });
        }, subscriptionFrame);
        if (unsubscriptionFrame !== Infinity) {
            this.schedule(function () { return subscription.unsubscribe(); }, unsubscriptionFrame);
        }
        this.flushTests.push(flushTest);
        var runMode = this.runMode;
        return {
            toBe: function (marbles, values, errorValue) {
                flushTest.ready = true;
                flushTest.expected = TestScheduler.parseMarbles(marbles, values, errorValue, true, runMode);
            },
            toEqual: function (other) {
                flushTest.ready = true;
                flushTest.expected = [];
                _this.schedule(function () {
                    subscription = other.subscribe({
                        next: function (x) {
                            var value = x instanceof Observable ? _this.materializeInnerObservable(x, _this.frame) : x;
                            flushTest.expected.push({ frame: _this.frame, notification: nextNotification(value) });
                        },
                        error: function (error) {
                            flushTest.expected.push({ frame: _this.frame, notification: errorNotification(error) });
                        },
                        complete: function () {
                            flushTest.expected.push({ frame: _this.frame, notification: COMPLETE_NOTIFICATION });
                        },
                    });
                }, subscriptionFrame);
            },
        };
    };
    TestScheduler.prototype.expectSubscriptions = function (actualSubscriptionLogs) {
        var flushTest = { actual: actualSubscriptionLogs, ready: false };
        this.flushTests.push(flushTest);
        var runMode = this.runMode;
        return {
            toBe: function (marblesOrMarblesArray) {
                var marblesArray = typeof marblesOrMarblesArray === 'string' ? [marblesOrMarblesArray] : marblesOrMarblesArray;
                flushTest.ready = true;
                flushTest.expected = marblesArray
                    .map(function (marbles) { return TestScheduler.parseMarblesAsSubscriptions(marbles, runMode); })
                    .filter(function (marbles) { return marbles.subscribedFrame !== Infinity; });
            },
        };
    };
    TestScheduler.prototype.flush = function () {
        var _this = this;
        var hotObservables = this.hotObservables;
        while (hotObservables.length > 0) {
            hotObservables.shift().setup();
        }
        _super.prototype.flush.call(this);
        this.flushTests = this.flushTests.filter(function (test) {
            if (test.ready) {
                _this.assertDeepEqual(test.actual, test.expected);
                return false;
            }
            return true;
        });
    };
    TestScheduler.parseMarblesAsSubscriptions = function (marbles, runMode) {
        var _this = this;
        if (runMode === void 0) { runMode = false; }
        if (typeof marbles !== 'string') {
            return new SubscriptionLog(Infinity);
        }
        var characters = __spreadArray([], __read(marbles));
        var len = characters.length;
        var groupStart = -1;
        var subscriptionFrame = Infinity;
        var unsubscriptionFrame = Infinity;
        var frame = 0;
        var _loop_1 = function (i) {
            var nextFrame = frame;
            var advanceFrameBy = function (count) {
                nextFrame += count * _this.frameTimeFactor;
            };
            var c = characters[i];
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
                            var buffer = characters.slice(i).join('');
                            var match = buffer.match(/^([0-9]+(?:\.[0-9]+)?)(ms|s|m) /);
                            if (match) {
                                i += match[0].length - 1;
                                var duration = parseFloat(match[1]);
                                var unit = match[2];
                                var durationInMs = void 0;
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
                                advanceFrameBy(durationInMs / this_1.frameTimeFactor);
                                break;
                            }
                        }
                    }
                    throw new Error("there can only be '^' and '!' markers in a " + "subscription marble diagram. Found instead '" + c + "'.");
            }
            frame = nextFrame;
            out_i_1 = i;
        };
        var this_1 = this, out_i_1;
        for (var i = 0; i < len; i++) {
            _loop_1(i);
            i = out_i_1;
        }
        if (unsubscriptionFrame < 0) {
            return new SubscriptionLog(subscriptionFrame);
        }
        else {
            return new SubscriptionLog(subscriptionFrame, unsubscriptionFrame);
        }
    };
    TestScheduler.parseMarbles = function (marbles, values, errorValue, materializeInnerObservables, runMode) {
        var _this = this;
        if (materializeInnerObservables === void 0) { materializeInnerObservables = false; }
        if (runMode === void 0) { runMode = false; }
        if (marbles.indexOf('!') !== -1) {
            throw new Error('conventional marble diagrams cannot have the ' + 'unsubscription marker "!"');
        }
        var characters = __spreadArray([], __read(marbles));
        var len = characters.length;
        var testMessages = [];
        var subIndex = runMode ? marbles.replace(/^[ ]+/, '').indexOf('^') : marbles.indexOf('^');
        var frame = subIndex === -1 ? 0 : subIndex * -this.frameTimeFactor;
        var getValue = typeof values !== 'object'
            ? function (x) { return x; }
            : function (x) {
                if (materializeInnerObservables && values[x] instanceof ColdObservable) {
                    return values[x].messages;
                }
                return values[x];
            };
        var groupStart = -1;
        var _loop_2 = function (i) {
            var nextFrame = frame;
            var advanceFrameBy = function (count) {
                nextFrame += count * _this.frameTimeFactor;
            };
            var notification = void 0;
            var c = characters[i];
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
                            var buffer = characters.slice(i).join('');
                            var match = buffer.match(/^([0-9]+(?:\.[0-9]+)?)(ms|s|m) /);
                            if (match) {
                                i += match[0].length - 1;
                                var duration = parseFloat(match[1]);
                                var unit = match[2];
                                var durationInMs = void 0;
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
                                advanceFrameBy(durationInMs / this_2.frameTimeFactor);
                                break;
                            }
                        }
                    }
                    notification = nextNotification(getValue(c));
                    advanceFrameBy(1);
                    break;
            }
            if (notification) {
                testMessages.push({ frame: groupStart > -1 ? groupStart : frame, notification: notification });
            }
            frame = nextFrame;
            out_i_2 = i;
        };
        var this_2 = this, out_i_2;
        for (var i = 0; i < len; i++) {
            _loop_2(i);
            i = out_i_2;
        }
        return testMessages;
    };
    TestScheduler.prototype.createAnimator = function () {
        var _this = this;
        if (!this.runMode) {
            throw new Error('animate() must only be used in run mode');
        }
        var lastHandle = 0;
        var map;
        var delegate = {
            requestAnimationFrame: function (callback) {
                if (!map) {
                    throw new Error('animate() was not called within run()');
                }
                var handle = ++lastHandle;
                map.set(handle, callback);
                return handle;
            },
            cancelAnimationFrame: function (handle) {
                if (!map) {
                    throw new Error('animate() was not called within run()');
                }
                map.delete(handle);
            },
        };
        var animate = function (marbles) {
            var e_1, _a;
            if (map) {
                throw new Error('animate() must not be called more than once within run()');
            }
            if (/[|#]/.test(marbles)) {
                throw new Error('animate() must not complete or error');
            }
            map = new Map();
            var messages = TestScheduler.parseMarbles(marbles, undefined, undefined, undefined, true);
            try {
                for (var messages_1 = __values(messages), messages_1_1 = messages_1.next(); !messages_1_1.done; messages_1_1 = messages_1.next()) {
                    var message = messages_1_1.value;
                    _this.schedule(function () {
                        var e_2, _a;
                        var now = _this.now();
                        var callbacks = Array.from(map.values());
                        map.clear();
                        try {
                            for (var callbacks_1 = (e_2 = void 0, __values(callbacks)), callbacks_1_1 = callbacks_1.next(); !callbacks_1_1.done; callbacks_1_1 = callbacks_1.next()) {
                                var callback = callbacks_1_1.value;
                                callback(now);
                            }
                        }
                        catch (e_2_1) { e_2 = { error: e_2_1 }; }
                        finally {
                            try {
                                if (callbacks_1_1 && !callbacks_1_1.done && (_a = callbacks_1.return)) _a.call(callbacks_1);
                            }
                            finally { if (e_2) throw e_2.error; }
                        }
                    }, message.frame);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (messages_1_1 && !messages_1_1.done && (_a = messages_1.return)) _a.call(messages_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        };
        return { animate: animate, delegate: delegate };
    };
    TestScheduler.prototype.createDelegates = function () {
        var _this = this;
        var lastHandle = 0;
        var scheduleLookup = new Map();
        var run = function () {
            var now = _this.now();
            var scheduledRecords = Array.from(scheduleLookup.values());
            var scheduledRecordsDue = scheduledRecords.filter(function (_a) {
                var due = _a.due;
                return due <= now;
            });
            var dueImmediates = scheduledRecordsDue.filter(function (_a) {
                var type = _a.type;
                return type === 'immediate';
            });
            if (dueImmediates.length > 0) {
                var _a = dueImmediates[0], handle = _a.handle, handler = _a.handler;
                scheduleLookup.delete(handle);
                handler();
                return;
            }
            var dueIntervals = scheduledRecordsDue.filter(function (_a) {
                var type = _a.type;
                return type === 'interval';
            });
            if (dueIntervals.length > 0) {
                var firstDueInterval = dueIntervals[0];
                var duration = firstDueInterval.duration, handler = firstDueInterval.handler;
                firstDueInterval.due = now + duration;
                firstDueInterval.subscription = _this.schedule(run, duration);
                handler();
                return;
            }
            var dueTimeouts = scheduledRecordsDue.filter(function (_a) {
                var type = _a.type;
                return type === 'timeout';
            });
            if (dueTimeouts.length > 0) {
                var _b = dueTimeouts[0], handle = _b.handle, handler = _b.handler;
                scheduleLookup.delete(handle);
                handler();
                return;
            }
            throw new Error('Expected a due immediate or interval');
        };
        var immediate = {
            setImmediate: function (handler) {
                var handle = ++lastHandle;
                scheduleLookup.set(handle, {
                    due: _this.now(),
                    duration: 0,
                    handle: handle,
                    handler: handler,
                    subscription: _this.schedule(run, 0),
                    type: 'immediate',
                });
                return handle;
            },
            clearImmediate: function (handle) {
                var value = scheduleLookup.get(handle);
                if (value) {
                    value.subscription.unsubscribe();
                    scheduleLookup.delete(handle);
                }
            },
        };
        var interval = {
            setInterval: function (handler, duration) {
                if (duration === void 0) { duration = 0; }
                var handle = ++lastHandle;
                scheduleLookup.set(handle, {
                    due: _this.now() + duration,
                    duration: duration,
                    handle: handle,
                    handler: handler,
                    subscription: _this.schedule(run, duration),
                    type: 'interval',
                });
                return handle;
            },
            clearInterval: function (handle) {
                var value = scheduleLookup.get(handle);
                if (value) {
                    value.subscription.unsubscribe();
                    scheduleLookup.delete(handle);
                }
            },
        };
        var timeout = {
            setTimeout: function (handler, duration) {
                if (duration === void 0) { duration = 0; }
                var handle = ++lastHandle;
                scheduleLookup.set(handle, {
                    due: _this.now() + duration,
                    duration: duration,
                    handle: handle,
                    handler: handler,
                    subscription: _this.schedule(run, duration),
                    type: 'timeout',
                });
                return handle;
            },
            clearTimeout: function (handle) {
                var value = scheduleLookup.get(handle);
                if (value) {
                    value.subscription.unsubscribe();
                    scheduleLookup.delete(handle);
                }
            },
        };
        return { immediate: immediate, interval: interval, timeout: timeout };
    };
    TestScheduler.prototype.run = function (callback) {
        var prevFrameTimeFactor = TestScheduler.frameTimeFactor;
        var prevMaxFrames = this.maxFrames;
        TestScheduler.frameTimeFactor = 1;
        this.maxFrames = Infinity;
        this.runMode = true;
        var animator = this.createAnimator();
        var delegates = this.createDelegates();
        animationFrameProvider.delegate = animator.delegate;
        dateTimestampProvider.delegate = this;
        immediateProvider.delegate = delegates.immediate;
        intervalProvider.delegate = delegates.interval;
        timeoutProvider.delegate = delegates.timeout;
        performanceTimestampProvider.delegate = this;
        var helpers = {
            cold: this.createColdObservable.bind(this),
            hot: this.createHotObservable.bind(this),
            flush: this.flush.bind(this),
            time: this.createTime.bind(this),
            expectObservable: this.expectObservable.bind(this),
            expectSubscriptions: this.expectSubscriptions.bind(this),
            animate: animator.animate,
        };
        try {
            var ret = callback(helpers);
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
    };
    TestScheduler.frameTimeFactor = 10;
    return TestScheduler;
}(VirtualTimeScheduler));
export { TestScheduler };
//# sourceMappingURL=TestScheduler.js.map