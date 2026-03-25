"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = void 0;
const fs_minipass_1 = require("@isaacs/fs-minipass");
const node_path_1 = __importDefault(require("node:path"));
const list_js_1 = require("./list.js");
const make_command_js_1 = require("./make-command.js");
const pack_js_1 = require("./pack.js");
const createFileSync = (opt, files) => {
    const p = new pack_js_1.PackSync(opt);
    const stream = new fs_minipass_1.WriteStreamSync(opt.file, {
        mode: opt.mode || 0o666,
    });
    p.pipe(stream);
    addFilesSync(p, files);
};
const createFile = (opt, files) => {
    const p = new pack_js_1.Pack(opt);
    const stream = new fs_minipass_1.WriteStream(opt.file, {
        mode: opt.mode || 0o666,
    });
    p.pipe(stream);
    const promise = new Promise((res, rej) => {
        stream.on('error', rej);
        stream.on('close', res);
        p.on('error', rej);
    });
    addFilesAsync(p, files);
    return promise;
};
const addFilesSync = (p, files) => {
    files.forEach(file => {
        if (file.charAt(0) === '@') {
            (0, list_js_1.list)({
                file: node_path_1.default.resolve(p.cwd, file.slice(1)),
                sync: true,
                noResume: true,
                onReadEntry: entry => p.add(entry),
            });
        }
        else {
            p.add(file);
        }
    });
    p.end();
};
const addFilesAsync = async (p, files) => {
    for (let i = 0; i < files.length; i++) {
        const file = String(files[i]);
        if (file.charAt(0) === '@') {
            await (0, list_js_1.list)({
                file: node_path_1.default.resolve(String(p.cwd), file.slice(1)),
                noResume: true,
                onReadEntry: entry => {
                    p.add(entry);
                },
            });
        }
        else {
            p.add(file);
        }
    }
    p.end();
};
const createSync = (opt, files) => {
    const p = new pack_js_1.PackSync(opt);
    addFilesSync(p, files);
    return p;
};
const createAsync = (opt, files) => {
    const p = new pack_js_1.Pack(opt);
    addFilesAsync(p, files);
    return p;
};
exports.create = (0, make_command_js_1.makeCommand)(createFileSync, createFile, createSync, createAsync, (_opt, files) => {
    if (!files?.length) {
        throw new TypeError('no paths specified to add to archive');
    }
});
//# sourceMappingURL=create.js.map