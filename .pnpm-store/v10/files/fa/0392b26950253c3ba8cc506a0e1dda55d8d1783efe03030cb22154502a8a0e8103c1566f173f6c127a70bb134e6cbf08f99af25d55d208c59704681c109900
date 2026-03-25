"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ansis_1 = __importDefault(require("ansis"));
const cli_spinners_1 = __importDefault(require("cli-spinners"));
const cache_1 = __importDefault(require("../../cache"));
const screen_1 = require("../../screen");
const theme_1 = require("../theme");
const base_1 = require("./base");
const ansiEscapes = require('ansi-escapes');
class SpinnerAction extends base_1.ActionBase {
    type = 'spinner';
    color = 'magenta';
    frameIndex;
    frames;
    spinner;
    constructor() {
        super();
        this.frames = this.getFrames();
        this.frameIndex = 0;
    }
    colorize(s) {
        return (0, theme_1.colorize)(this.color, s);
    }
    _frame() {
        const frame = this.frames[this.frameIndex];
        this.frameIndex = ++this.frameIndex % this.frames.length;
        return this.colorize(frame);
    }
    _lines(s) {
        return ansis_1.default.strip(s).split('\n')
            .map((l) => Math.ceil(l.length / screen_1.errtermwidth))
            .reduce((c, i) => c + i, 0);
    }
    _pause(icon) {
        if (this.spinner)
            clearInterval(this.spinner);
        this._reset();
        if (icon)
            this._render(` ${icon}`);
        this.output = undefined;
    }
    _render(icon) {
        if (!this.task)
            return;
        this._reset();
        this._flushStdout();
        const frame = icon === 'spinner' ? ` ${this._frame()}` : icon || '';
        const status = this.task.status ? ` ${this.task.status}` : '';
        this.output = `${this.task.action}...${frame}${status}\n`;
        this._write(this.std, this.output);
    }
    _reset() {
        if (!this.output)
            return;
        const lines = this._lines(this.output);
        this._write(this.std, ansiEscapes.cursorLeft + ansiEscapes.cursorUp(lines) + ansiEscapes.eraseDown);
        this.output = undefined;
    }
    _start(opts) {
        this.color = cache_1.default.getInstance().get('config')?.theme?.spinner ?? this.color;
        if (opts.style)
            this.frames = this.getFrames(opts);
        this._reset();
        if (this.spinner)
            clearInterval(this.spinner);
        this._render();
        this.spinner = setInterval((icon) => this._render.bind(this)(icon), process.platform === 'win32' ? 500 : 100, 'spinner');
        const interval = this.spinner;
        interval.unref();
    }
    _stop(status) {
        if (this.task)
            this.task.status = status;
        if (this.spinner)
            clearInterval(this.spinner);
        this._render();
        this.output = undefined;
    }
    getFrames(opts) {
        if (opts?.style)
            return cli_spinners_1.default[opts.style].frames;
        return cli_spinners_1.default[process.platform === 'win32' ? 'line' : 'dots2'].frames;
    }
}
exports.default = SpinnerAction;
