"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionBase = void 0;
const node_util_1 = require("node:util");
const util_1 = require("../../util/util");
class ActionBase {
    std = 'stderr';
    stdmocks;
    type;
    stdmockOrigs = {
        stderr: process.stderr.write,
        stdout: process.stdout.write,
    };
    get globals() {
        ;
        globalThis.ux = globalThis.ux || {};
        const globals = globalThis.ux;
        globals.action = globals.action || {};
        return globals;
    }
    get output() {
        return this.globals.output;
    }
    set output(output) {
        this.globals.output = output;
    }
    get running() {
        return Boolean(this.task);
    }
    get status() {
        return this.task ? this.task.status : undefined;
    }
    set status(status) {
        const { task } = this;
        if (!task) {
            return;
        }
        if (task.status === status) {
            return;
        }
        this._updateStatus(status, task.status);
        task.status = status;
    }
    get task() {
        return this.globals.action.task;
    }
    set task(task) {
        this.globals.action.task = task;
    }
    // flush mocked stdout/stderr
    _flushStdout() {
        try {
            let output = '';
            let std;
            while (this.stdmocks && this.stdmocks.length > 0) {
                const cur = this.stdmocks.shift();
                std = cur[0];
                this._write(std, cur[1]);
                output += cur[1][0].toString('utf8');
            }
            // add newline if there isn't one already
            // otherwise we'll just overwrite it when we render
            if (output && std && output.at(-1) !== '\n') {
                this._write(std, '\n');
            }
        }
        catch (error) {
            this._write('stderr', (0, node_util_1.inspect)(error));
        }
    }
    _pause(_) {
        throw new Error('not implemented');
    }
    _resume() {
        if (this.task)
            this.start(this.task.action, this.task.status);
    }
    _start(_opts) {
        throw new Error('not implemented');
    }
    // mock out stdout/stderr so it doesn't screw up the rendering
    _stdout(toggle) {
        try {
            if (toggle) {
                if (this.stdmocks)
                    return;
                this.stdmockOrigs = {
                    stderr: process.stderr.write,
                    stdout: process.stdout.write,
                };
                this.stdmocks = [];
                process.stdout.write = (...args) => {
                    this.stdmocks.push(['stdout', args]);
                    return true;
                };
                process.stderr.write = (...args) => {
                    this.stdmocks.push(['stderr', args]);
                    return true;
                };
            }
            else {
                if (!this.stdmocks)
                    return;
                // this._write('stderr', '\nresetstdmock\n\n\n')
                delete this.stdmocks;
                process.stdout.write = this.stdmockOrigs.stdout;
                process.stderr.write = this.stdmockOrigs.stderr;
            }
        }
        catch (error) {
            this._write('stderr', (0, node_util_1.inspect)(error));
        }
    }
    _stop(_) {
        throw new Error('not implemented');
    }
    _updateStatus(_, __) {
        // Not implemented
    }
    // write to the real stdout/stderr
    _write(std, s) {
        switch (std) {
            case 'stderr': {
                this.stdmockOrigs.stderr.apply(process.stderr, (0, util_1.castArray)(s));
                break;
            }
            case 'stdout': {
                this.stdmockOrigs.stdout.apply(process.stdout, (0, util_1.castArray)(s));
                break;
            }
            default: {
                throw new Error(`invalid std: ${std}`);
            }
        }
    }
    pause(fn, icon) {
        const { task } = this;
        const active = task && task.active;
        if (task && active) {
            this._pause(icon);
            this._stdout(false);
            task.active = false;
        }
        const ret = fn();
        if (task && active) {
            this._resume();
        }
        return ret;
    }
    async pauseAsync(fn, icon) {
        const { task } = this;
        const active = task && task.active;
        if (task && active) {
            this._pause(icon);
            this._stdout(false);
            task.active = false;
        }
        const ret = await fn();
        if (task && active) {
            this._resume();
        }
        return ret;
    }
    start(action, status, opts = {}) {
        this.std = opts.stdout ? 'stdout' : 'stderr';
        const task = { action, active: Boolean(this.task && this.task.active), status };
        this.task = task;
        this._start(opts);
        task.active = true;
        this._stdout(true);
    }
    stop(msg = 'done') {
        const { task } = this;
        if (!task) {
            return;
        }
        this._stop(msg);
        task.active = false;
        this.task = undefined;
        this._stdout(false);
    }
}
exports.ActionBase = ActionBase;
