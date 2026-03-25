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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extract = void 0;
// tar -x
const fsm = __importStar(require("@isaacs/fs-minipass"));
const node_fs_1 = __importDefault(require("node:fs"));
const list_js_1 = require("./list.js");
const make_command_js_1 = require("./make-command.js");
const unpack_js_1 = require("./unpack.js");
const extractFileSync = (opt) => {
    const u = new unpack_js_1.UnpackSync(opt);
    const file = opt.file;
    const stat = node_fs_1.default.statSync(file);
    // This trades a zero-byte read() syscall for a stat
    // However, it will usually result in less memory allocation
    const readSize = opt.maxReadSize || 16 * 1024 * 1024;
    const stream = new fsm.ReadStreamSync(file, {
        readSize: readSize,
        size: stat.size,
    });
    stream.pipe(u);
};
const extractFile = (opt, _) => {
    const u = new unpack_js_1.Unpack(opt);
    const readSize = opt.maxReadSize || 16 * 1024 * 1024;
    const file = opt.file;
    const p = new Promise((resolve, reject) => {
        u.on('error', reject);
        u.on('close', resolve);
        // This trades a zero-byte read() syscall for a stat
        // However, it will usually result in less memory allocation
        node_fs_1.default.stat(file, (er, stat) => {
            if (er) {
                reject(er);
            }
            else {
                const stream = new fsm.ReadStream(file, {
                    readSize: readSize,
                    size: stat.size,
                });
                stream.on('error', reject);
                stream.pipe(u);
            }
        });
    });
    return p;
};
exports.extract = (0, make_command_js_1.makeCommand)(extractFileSync, extractFile, opt => new unpack_js_1.UnpackSync(opt), opt => new unpack_js_1.Unpack(opt), (opt, files) => {
    if (files?.length)
        (0, list_js_1.filesFilter)(opt, files);
});
//# sourceMappingURL=extract.js.map