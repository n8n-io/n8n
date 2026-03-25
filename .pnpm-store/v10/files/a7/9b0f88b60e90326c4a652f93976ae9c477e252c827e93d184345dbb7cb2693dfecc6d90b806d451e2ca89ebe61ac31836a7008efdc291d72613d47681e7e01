"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CronJob = void 0;
const child_process_1 = require("child_process");
const errors_1 = require("./errors");
const time_1 = require("./time");
class CronJob {
    get isActive() {
        return this._isActive;
    }
    get isCallbackRunning() {
        return this._isCallbackRunning;
    }
    constructor(cronTime, onTick, onComplete, start, timeZone, context, runOnInit, utcOffset, unrefTimeout, waitForCompletion, errorHandler, name, threshold) {
        this.unrefTimeout = false;
        this.lastExecution = null;
        this.runOnce = false;
        this.waitForCompletion = false;
        this.threshold = 250;
        this._isActive = false;
        this._isCallbackRunning = false;
        this._callbacks = [];
        this.context = (context !== null && context !== void 0 ? context : this);
        this.waitForCompletion = Boolean(waitForCompletion);
        this.errorHandler = errorHandler;
        if (timeZone != null && utcOffset != null) {
            throw new errors_1.ExclusiveParametersError('timeZone', 'utcOffset');
        }
        if (timeZone != null) {
            this.cronTime = new time_1.CronTime(cronTime, timeZone, null);
        }
        else if (utcOffset != null) {
            this.cronTime = new time_1.CronTime(cronTime, null, utcOffset);
        }
        else {
            this.cronTime = new time_1.CronTime(cronTime, timeZone, utcOffset);
        }
        if (unrefTimeout != null) {
            this.unrefTimeout = unrefTimeout;
        }
        if (onComplete != null) {
            this.onComplete = this._fnWrap(onComplete);
        }
        if (threshold != null) {
            this.threshold = Math.abs(threshold);
        }
        if (name != null) {
            this.name = name;
        }
        if (this.cronTime.realDate) {
            this.runOnce = true;
        }
        this.addCallback(this._fnWrap(onTick));
        if (runOnInit) {
            this.lastExecution = new Date();
            void this.fireOnTick();
        }
        if (start)
            this.start();
    }
    static from(params) {
        if (params.timeZone != null && params.utcOffset != null) {
            throw new errors_1.ExclusiveParametersError('timeZone', 'utcOffset');
        }
        if (params.timeZone != null) {
            return new CronJob(params.cronTime, params.onTick, params.onComplete, params.start, params.timeZone, params.context, params.runOnInit, params.utcOffset, params.unrefTimeout, params.waitForCompletion, params.errorHandler, params.name, params.threshold);
        }
        else if (params.utcOffset != null) {
            return new CronJob(params.cronTime, params.onTick, params.onComplete, params.start, null, params.context, params.runOnInit, params.utcOffset, params.unrefTimeout, params.waitForCompletion, params.errorHandler, params.name, params.threshold);
        }
        else {
            return new CronJob(params.cronTime, params.onTick, params.onComplete, params.start, params.timeZone, params.context, params.runOnInit, params.utcOffset, params.unrefTimeout, params.waitForCompletion, params.errorHandler, params.name, params.threshold);
        }
    }
    _fnWrap(cmd) {
        var _a, _b;
        switch (typeof cmd) {
            case 'function': {
                return cmd;
            }
            case 'string': {
                const [command, ...args] = cmd.split(' ');
                return child_process_1.spawn.bind(undefined, command !== null && command !== void 0 ? command : cmd, args, {});
            }
            case 'object': {
                return child_process_1.spawn.bind(undefined, cmd.command, (_a = cmd.args) !== null && _a !== void 0 ? _a : [], (_b = cmd.options) !== null && _b !== void 0 ? _b : {});
            }
        }
    }
    addCallback(callback) {
        if (typeof callback === 'function') {
            this._callbacks.push(callback);
        }
    }
    setTime(time) {
        if (!(time instanceof time_1.CronTime)) {
            throw new errors_1.CronError('time must be an instance of CronTime.');
        }
        const wasRunning = this._isActive;
        this.stop();
        this.cronTime = time;
        if (time.realDate)
            this.runOnce = true;
        if (wasRunning)
            this.start();
    }
    nextDate() {
        return this.cronTime.sendAt();
    }
    fireOnTick() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.waitForCompletion && this._isCallbackRunning)
                return;
            this._isCallbackRunning = true;
            try {
                for (const callback of this._callbacks) {
                    const result = callback.call(this.context, this.onComplete);
                    if (result &&
                        typeof result === 'object' &&
                        typeof result.then === 'function') {
                        if (this.waitForCompletion) {
                            yield result;
                        }
                        else {
                            result.catch(error => {
                                if (this.errorHandler != null)
                                    this.errorHandler(error);
                                else
                                    console.error('[Cron] error in callback', error);
                            });
                        }
                    }
                }
            }
            catch (error) {
                if (this.errorHandler != null)
                    this.errorHandler(error);
                else
                    console.error('[Cron] error in callback', error);
            }
            finally {
                this._isCallbackRunning = false;
            }
        });
    }
    nextDates(i) {
        return this.cronTime.sendAt(i !== null && i !== void 0 ? i : 0);
    }
    start() {
        if (this._isActive)
            return;
        this._isActive = true;
        const MAXDELAY = 2147483647;
        let timeout = this.cronTime.getTimeout();
        let remaining = 0;
        let startTime;
        const setCronTimeout = (t) => {
            startTime = Date.now();
            this._timeout = setTimeout(callbackWrapper, Math.max(t, 1));
            if (this.unrefTimeout && typeof this._timeout.unref === 'function') {
                this._timeout.unref();
            }
        };
        const callbackWrapper = () => {
            const diff = startTime + timeout - Date.now();
            if (diff > 0) {
                let newTimeout = this.cronTime.getTimeout();
                if (newTimeout > diff) {
                    newTimeout = diff;
                }
                remaining += newTimeout;
            }
            if (remaining) {
                if (remaining > MAXDELAY) {
                    remaining -= MAXDELAY;
                    timeout = MAXDELAY;
                }
                else {
                    timeout = remaining;
                    remaining = 0;
                }
                setCronTimeout(timeout);
            }
            else {
                this.lastExecution = new Date();
                this._isActive = false;
                if (!this.runOnce)
                    this.start();
                void this.fireOnTick();
            }
        };
        if (timeout >= 0) {
            if (timeout > MAXDELAY) {
                remaining = timeout - MAXDELAY;
                timeout = MAXDELAY;
            }
            setCronTimeout(timeout);
        }
        else {
            const absoluteTimeout = Math.abs(timeout);
            const message = `[Cron] Missed execution deadline by ${absoluteTimeout}ms for job${this.name ? ` "${this.name}"` : ''} with cron expression '${String(this.cronTime.source)}'`;
            if (absoluteTimeout <= this.threshold) {
                console.warn(`${message}. Executing immediately.`);
                this.lastExecution = new Date();
                void this.fireOnTick();
            }
            else {
                console.warn(`${message}. Skipping execution as it exceeds threshold (${this.threshold}ms).`);
            }
            timeout = this.cronTime.getTimeout();
            setCronTimeout(timeout);
        }
    }
    lastDate() {
        return this.lastExecution;
    }
    _executeOnComplete() {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof this.onComplete !== 'function')
                return;
            try {
                yield this.onComplete.call(this.context);
            }
            catch (error) {
                console.error('[Cron] error in onComplete callback:', error);
            }
        });
    }
    _waitForJobCompletion() {
        return __awaiter(this, void 0, void 0, function* () {
            while (this._isCallbackRunning) {
                yield new Promise(resolve => setTimeout(resolve, 100));
            }
        });
    }
    stop() {
        if (this._timeout)
            clearTimeout(this._timeout);
        this._isActive = false;
        if (!this.waitForCompletion) {
            void this._executeOnComplete();
            return;
        }
        return Promise.resolve().then(() => __awaiter(this, void 0, void 0, function* () {
            yield this._waitForJobCompletion();
            yield this._executeOnComplete();
        }));
    }
}
exports.CronJob = CronJob;
