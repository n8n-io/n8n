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
exports.list = exports.filesFilter = void 0;
// tar -t
const fsm = __importStar(require("@isaacs/fs-minipass"));
const node_fs_1 = __importDefault(require("node:fs"));
const path_1 = require("path");
const make_command_js_1 = require("./make-command.js");
const parse_js_1 = require("./parse.js");
const strip_trailing_slashes_js_1 = require("./strip-trailing-slashes.js");
const onReadEntryFunction = (opt) => {
    const onReadEntry = opt.onReadEntry;
    opt.onReadEntry =
        onReadEntry ?
            e => {
                onReadEntry(e);
                e.resume();
            }
            : e => e.resume();
};
// construct a filter that limits the file entries listed
// include child entries if a dir is included
const filesFilter = (opt, files) => {
    const map = new Map(files.map(f => [(0, strip_trailing_slashes_js_1.stripTrailingSlashes)(f), true]));
    const filter = opt.filter;
    const mapHas = (file, r = '') => {
        const root = r || (0, path_1.parse)(file).root || '.';
        let ret;
        if (file === root)
            ret = false;
        else {
            const m = map.get(file);
            if (m !== undefined) {
                ret = m;
            }
            else {
                ret = mapHas((0, path_1.dirname)(file), root);
            }
        }
        map.set(file, ret);
        return ret;
    };
    opt.filter =
        filter ?
            (file, entry) => filter(file, entry) && mapHas((0, strip_trailing_slashes_js_1.stripTrailingSlashes)(file))
            : file => mapHas((0, strip_trailing_slashes_js_1.stripTrailingSlashes)(file));
};
exports.filesFilter = filesFilter;
const listFileSync = (opt) => {
    const p = new parse_js_1.Parser(opt);
    const file = opt.file;
    let fd;
    try {
        fd = node_fs_1.default.openSync(file, 'r');
        const stat = node_fs_1.default.fstatSync(fd);
        const readSize = opt.maxReadSize || 16 * 1024 * 1024;
        if (stat.size < readSize) {
            const buf = Buffer.allocUnsafe(stat.size);
            const read = node_fs_1.default.readSync(fd, buf, 0, stat.size, 0);
            p.end(read === buf.byteLength ? buf : buf.subarray(0, read));
        }
        else {
            let pos = 0;
            const buf = Buffer.allocUnsafe(readSize);
            while (pos < stat.size) {
                const bytesRead = node_fs_1.default.readSync(fd, buf, 0, readSize, pos);
                if (bytesRead === 0)
                    break;
                pos += bytesRead;
                p.write(buf.subarray(0, bytesRead));
            }
            p.end();
        }
    }
    finally {
        if (typeof fd === 'number') {
            try {
                node_fs_1.default.closeSync(fd);
                /* c8 ignore next */
            }
            catch (er) { }
        }
    }
};
const listFile = (opt, _files) => {
    const parse = new parse_js_1.Parser(opt);
    const readSize = opt.maxReadSize || 16 * 1024 * 1024;
    const file = opt.file;
    const p = new Promise((resolve, reject) => {
        parse.on('error', reject);
        parse.on('end', resolve);
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
                stream.pipe(parse);
            }
        });
    });
    return p;
};
exports.list = (0, make_command_js_1.makeCommand)(listFileSync, listFile, opt => new parse_js_1.Parser(opt), opt => new parse_js_1.Parser(opt), (opt, files) => {
    if (files?.length)
        (0, exports.filesFilter)(opt, files);
    if (!opt.noResume)
        onReadEntryFunction(opt);
});
//# sourceMappingURL=list.js.map