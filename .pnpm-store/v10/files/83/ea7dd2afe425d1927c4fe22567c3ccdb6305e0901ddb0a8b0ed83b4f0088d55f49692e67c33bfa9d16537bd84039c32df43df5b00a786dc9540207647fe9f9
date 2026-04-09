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
exports.cloneInteger = exports.fieldIndexOf = exports.osopen = exports.osend = exports.oswrite = exports.fclose = exports.fread = exports.fstat = exports.fopen = exports.getThriftEnum = exports.getBitWidth = exports.decodeThrift = exports.serializeThrift = void 0;
const thrift_1 = __importDefault(require("thrift"));
const fs_1 = __importDefault(require("fs"));
const parquet_thrift = __importStar(require("../gen-nodejs/parquet_types"));
const thrift_2 = require("thrift");
/**
 * We need to patch Thrift's TFramedTransport class bc the TS type definitions
 * do not define a `readPos` field, even though the class implementation has
 * one.
 */
class fixedTFramedTransport extends thrift_1.default.TFramedTransport {
    inBuf;
    readPos;
    constructor(inBuf) {
        super(inBuf);
        this.inBuf = inBuf;
        this.readPos = 0;
    }
}
/** Patch PageLocation to be three element array that has getters/setters
 * for each of the properties (offset, compressed_page_size, first_row_index)
 * This saves space considerably as we do not need to store the full variable
 * names for every PageLocation
 */
const getterSetter = (index) => ({
    get: function () {
        return this[index];
    },
    set: function (value) {
        return (this[index] = value);
    },
});
Object.defineProperty(parquet_thrift.PageLocation.prototype, 'offset', getterSetter(0));
Object.defineProperty(parquet_thrift.PageLocation.prototype, 'compressed_page_size', getterSetter(1));
Object.defineProperty(parquet_thrift.PageLocation.prototype, 'first_row_index', getterSetter(2));
/**
 * Helper function that serializes a thrift object into a buffer
 */
const serializeThrift = function (obj) {
    const output = [];
    const callBack = function (buf) {
        output.push(buf);
    };
    const transport = new thrift_1.default.TBufferedTransport(undefined, callBack);
    const protocol = new thrift_1.default.TCompactProtocol(transport);
    //@ts-expect-error, https://issues.apache.org/jira/browse/THRIFT-3872
    obj.write(protocol);
    transport.flush();
    return Buffer.concat(output);
};
exports.serializeThrift = serializeThrift;
const decodeThrift = function (obj, buf, offset) {
    if (!offset) {
        offset = 0;
    }
    const transport = new fixedTFramedTransport(buf);
    transport.readPos = offset;
    const protocol = new thrift_1.default.TCompactProtocol(transport);
    //@ts-expect-error, https://issues.apache.org/jira/browse/THRIFT-3872
    obj.read(protocol);
    return transport.readPos - offset;
};
exports.decodeThrift = decodeThrift;
/**
 * Get the number of bits required to store a given value
 */
const getBitWidth = function (val) {
    if (val === 0) {
        return 0;
    }
    else {
        return Math.ceil(Math.log2(val + 1));
    }
};
exports.getBitWidth = getBitWidth;
/**
 * FIXME not ideal that this is linear
 */
const getThriftEnum = function (klass, value) {
    for (const k in klass) {
        if (klass[k] === value) {
            return k;
        }
    }
    throw new Error('Invalid ENUM value');
};
exports.getThriftEnum = getThriftEnum;
const fopen = function (filePath) {
    return new Promise((resolve, reject) => {
        fs_1.default.open(filePath, 'r', (err, fd) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(fd);
            }
        });
    });
};
exports.fopen = fopen;
const fstat = function (filePath) {
    return new Promise((resolve, reject) => {
        fs_1.default.stat(filePath, (err, stat) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(stat);
            }
        });
    });
};
exports.fstat = fstat;
const fread = function (fd, position, length) {
    const buffer = Buffer.alloc(length);
    return new Promise((resolve, reject) => {
        fs_1.default.read(fd, buffer, 0, length, position, (err, bytesRead, buf) => {
            if (err || bytesRead != length) {
                reject(err || Error('read failed'));
            }
            else {
                resolve(buf);
            }
        });
    });
};
exports.fread = fread;
const fclose = function (fd) {
    return new Promise((resolve, reject) => {
        fs_1.default.close(fd, (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(err);
            }
        });
    });
};
exports.fclose = fclose;
const oswrite = function (os, buf) {
    return new Promise((resolve, reject) => {
        os.write(buf, (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(err);
            }
        });
    });
};
exports.oswrite = oswrite;
const osend = function (os) {
    return new Promise((resolve, reject) => {
        os.end((err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(err);
            }
        });
    });
};
exports.osend = osend;
const osopen = function (path, opts) {
    return new Promise((resolve, reject) => {
        const outputStream = fs_1.default.createWriteStream(path, opts);
        outputStream.on('open', function (_fd) {
            resolve(outputStream);
        });
        outputStream.on('error', function (err) {
            reject(err);
        });
    });
};
exports.osopen = osopen;
const fieldIndexOf = function (arr, elem) {
    for (let j = 0; j < arr.length; ++j) {
        if (arr[j].length !== elem.length) {
            continue;
        }
        let m = true;
        for (let i = 0; i < elem.length; ++i) {
            if (arr[j][i] !== elem[i]) {
                m = false;
                break;
            }
        }
        if (m) {
            return j;
        }
    }
    return -1;
};
exports.fieldIndexOf = fieldIndexOf;
const cloneInteger = (int) => {
    return new thrift_2.Int64(int.valueOf());
};
exports.cloneInteger = cloneInteger;
