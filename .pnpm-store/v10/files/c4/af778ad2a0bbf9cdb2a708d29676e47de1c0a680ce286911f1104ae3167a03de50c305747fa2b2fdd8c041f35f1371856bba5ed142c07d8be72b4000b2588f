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
exports.OutputWriter = void 0;
const Rx = __importStar(require("rxjs"));
/**
 * Class responsible for actually writing output onto a writable stream.
 */
class OutputWriter {
    constructor({ outputStream, group, commands, }) {
        this.activeCommandIndex = 0;
        this.outputStream = outputStream;
        this.group = group;
        this.buffers = commands.map(() => []);
        if (this.group) {
            Rx.merge(...commands.map((c) => c.close)).subscribe((command) => {
                if (command.index !== this.activeCommandIndex) {
                    return;
                }
                for (let i = command.index + 1; i < commands.length; i++) {
                    this.activeCommandIndex = i;
                    this.flushBuffer(i);
                    if (!commands[i].exited) {
                        break;
                    }
                }
            });
        }
    }
    write(command, text) {
        if (this.group && command) {
            if (command.index <= this.activeCommandIndex) {
                this.outputStream.write(text);
            }
            else {
                this.buffers[command.index].push(text);
            }
        }
        else {
            // "global" logs (command=null) are output out of order
            this.outputStream.write(text);
        }
    }
    flushBuffer(index) {
        this.buffers[index].forEach((t) => this.outputStream.write(t));
        this.buffers[index] = [];
    }
}
exports.OutputWriter = OutputWriter;
