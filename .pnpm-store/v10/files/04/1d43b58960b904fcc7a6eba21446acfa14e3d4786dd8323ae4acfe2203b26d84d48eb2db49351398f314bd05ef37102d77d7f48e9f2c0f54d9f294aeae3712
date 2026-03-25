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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectFileSync = exports.detectFile = exports.analyse = exports.detect = void 0;
const node_1 = __importDefault(require("./fs/node"));
const ascii_1 = __importDefault(require("./encoding/ascii"));
const utf8_1 = __importDefault(require("./encoding/utf8"));
const unicode = __importStar(require("./encoding/unicode"));
const mbcs = __importStar(require("./encoding/mbcs"));
const sbcs = __importStar(require("./encoding/sbcs"));
const iso2022 = __importStar(require("./encoding/iso2022"));
const utils_1 = require("./utils");
const recognisers = [
    new utf8_1.default(),
    new unicode.UTF_16BE(),
    new unicode.UTF_16LE(),
    new unicode.UTF_32BE(),
    new unicode.UTF_32LE(),
    new mbcs.sjis(),
    new mbcs.big5(),
    new mbcs.euc_jp(),
    new mbcs.euc_kr(),
    new mbcs.gb_18030(),
    new iso2022.ISO_2022_JP(),
    new iso2022.ISO_2022_KR(),
    new iso2022.ISO_2022_CN(),
    new sbcs.ISO_8859_1(),
    new sbcs.ISO_8859_2(),
    new sbcs.ISO_8859_5(),
    new sbcs.ISO_8859_6(),
    new sbcs.ISO_8859_7(),
    new sbcs.ISO_8859_8(),
    new sbcs.ISO_8859_9(),
    new sbcs.windows_1251(),
    new sbcs.windows_1256(),
    new sbcs.KOI8_R(),
    new ascii_1.default(),
];
const detect = (buffer) => {
    const matches = (0, exports.analyse)(buffer);
    return matches.length > 0 ? matches[0].name : null;
};
exports.detect = detect;
const analyse = (buffer) => {
    if (!(0, utils_1.isByteArray)(buffer)) {
        throw new Error('Input must be a byte array, e.g. Buffer or Uint8Array');
    }
    const byteStats = [];
    for (let i = 0; i < 256; i++)
        byteStats[i] = 0;
    for (let i = buffer.length - 1; i >= 0; i--)
        byteStats[buffer[i] & 0x00ff]++;
    let c1Bytes = false;
    for (let i = 0x80; i <= 0x9f; i += 1) {
        if (byteStats[i] !== 0) {
            c1Bytes = true;
            break;
        }
    }
    const context = {
        byteStats,
        c1Bytes,
        rawInput: buffer,
        rawLen: buffer.length,
        inputBytes: buffer,
        inputLen: buffer.length,
    };
    const matches = recognisers
        .map((rec) => {
        return rec.match(context);
    })
        .filter((match) => {
        return !!match;
    })
        .sort((a, b) => {
        return b.confidence - a.confidence;
    });
    return matches;
};
exports.analyse = analyse;
const detectFile = (filepath, opts = {}) => new Promise((resolve, reject) => {
    let fd;
    const fs = (0, node_1.default)();
    const handler = (err, buffer) => {
        if (fd) {
            fs.closeSync(fd);
        }
        if (err) {
            reject(err);
        }
        else {
            resolve((0, exports.detect)(buffer));
        }
    };
    if (opts && opts.sampleSize) {
        fd = fs.openSync(filepath, 'r');
        const sample = Buffer.allocUnsafe(opts.sampleSize);
        fs.read(fd, sample, 0, opts.sampleSize, opts.offset, (err) => {
            handler(err, sample);
        });
        return;
    }
    fs.readFile(filepath, handler);
});
exports.detectFile = detectFile;
const detectFileSync = (filepath, opts = {}) => {
    const fs = (0, node_1.default)();
    if (opts && opts.sampleSize) {
        const fd = fs.openSync(filepath, 'r');
        const sample = Buffer.allocUnsafe(opts.sampleSize);
        fs.readSync(fd, sample, 0, opts.sampleSize, opts.offset);
        fs.closeSync(fd);
        return (0, exports.detect)(sample);
    }
    return (0, exports.detect)(fs.readFileSync(filepath));
};
exports.detectFileSync = detectFileSync;
exports.default = {
    analyse: exports.analyse,
    detect: exports.detect,
    detectFileSync: exports.detectFileSync,
    detectFile: exports.detectFile,
};
//# sourceMappingURL=index.js.map