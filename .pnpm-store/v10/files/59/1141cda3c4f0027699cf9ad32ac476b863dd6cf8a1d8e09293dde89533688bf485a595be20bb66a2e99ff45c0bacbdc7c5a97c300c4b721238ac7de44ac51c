"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = require("./base");
class SimpleAction extends base_1.ActionBase {
    type = 'simple';
    _pause(icon) {
        if (icon)
            this._updateStatus(icon);
        else
            this._flush();
    }
    _resume() {
        // Not implemented
    }
    _start() {
        if (!this.task)
            return;
        this._render(this.task.action, this.task.status);
    }
    _stop(status) {
        if (!this.task)
            return;
        this._updateStatus(status, this.task.status, true);
    }
    _updateStatus(status, prevStatus, newline = false) {
        if (!this.task)
            return;
        if (this.task.active && !prevStatus)
            this._write(this.std, ` ${status}`);
        else
            this._write(this.std, `${this.task.action}... ${status}`);
        if (newline || !prevStatus)
            this._flush();
    }
    _flush() {
        this._write(this.std, '\n');
        this._flushStdout();
    }
    _render(action, status) {
        if (!this.task)
            return;
        if (this.task.active)
            this._flush();
        this._write(this.std, status ? `${action}... ${status}` : `${action}...`);
    }
}
exports.default = SimpleAction;
