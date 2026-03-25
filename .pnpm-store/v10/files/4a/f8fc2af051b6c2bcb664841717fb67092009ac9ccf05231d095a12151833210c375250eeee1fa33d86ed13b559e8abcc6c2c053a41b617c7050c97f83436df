"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TscWatchClient = void 0;
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const events_1 = require("events");
const tscWatchLibPath = path.join(__dirname, '..', 'lib', 'tsc-watch');
class TscWatchClient extends events_1.EventEmitter {
    constructor(tscWatchPath = tscWatchLibPath) {
        super();
        this.tscWatchPath = tscWatchPath;
    }
    start(...args) {
        const options = { stdio: 'inherit' };
        this.tsc = (0, child_process_1.fork)(this.tscWatchPath, args, options);
        this.tsc.on('message', (msg) => {
            this.emit(...deserializeTscMessage(msg));
        });
        this.tsc.on('exit', (code, signal) => {
            this.emit('exit', code, signal);
        });
    }
    kill() {
        if (this.tsc && this.tsc.kill) {
            this.tsc.kill();
        }
        this.removeAllListeners();
    }
    runOnCompilationStartedCommand() {
        if (this.tsc) {
            this.tsc.send('run-on-compilation-started-command');
        }
    }
    runOnCompilationCompleteCommand() {
        if (this.tsc) {
            this.tsc.send('run-on-compilation-complete-command');
        }
    }
    runOnFirstSuccessCommand() {
        if (this.tsc) {
            this.tsc.send('run-on-first-success-command');
        }
    }
    runOnFailureCommand() {
        if (this.tsc) {
            this.tsc.send('run-on-failure-command');
        }
    }
    runOnSuccessCommand() {
        if (this.tsc) {
            this.tsc.send('run-on-success-command');
        }
    }
    runOnEmitCommand() {
        if (this.tsc) {
            this.tsc.send('run-on-emit-command');
        }
    }
}
exports.TscWatchClient = TscWatchClient;
function deserializeTscMessage(strMsg) {
    const indexOfSeparator = strMsg.indexOf(':');
    if (indexOfSeparator === -1) {
        return [strMsg];
    }
    return [strMsg.substring(0, indexOfSeparator), strMsg.substring(indexOfSeparator + 1)];
}
