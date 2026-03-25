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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebFormData = exports.Node16FormData = exports.Node18FormData = exports.newFormData = void 0;
const runtime_1 = require("../runtime");
function isNamedValue(value) {
    return typeof value === "object" && value != null && "name" in value;
}
function newFormData() {
    return __awaiter(this, void 0, void 0, function* () {
        let formdata;
        if (runtime_1.RUNTIME.type === "node" && runtime_1.RUNTIME.parsedVersion != null && runtime_1.RUNTIME.parsedVersion >= 18) {
            formdata = new Node18FormData();
        }
        else if (runtime_1.RUNTIME.type === "node") {
            formdata = new Node16FormData();
        }
        else {
            formdata = new WebFormData();
        }
        yield formdata.setup();
        return formdata;
    });
}
exports.newFormData = newFormData;
/**
 * Form Data Implementation for Node.js 18+
 */
class Node18FormData {
    setup() {
        return __awaiter(this, void 0, void 0, function* () {
            this.fd = new (yield Promise.resolve().then(() => __importStar(require("formdata-node")))).FormData();
        });
    }
    append(key, value) {
        var _a;
        (_a = this.fd) === null || _a === void 0 ? void 0 : _a.append(key, value);
    }
    appendFile(key, value, fileName) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            if (fileName == null && isNamedValue(value)) {
                fileName = value.name;
            }
            if (value instanceof (yield Promise.resolve().then(() => __importStar(require("readable-stream")))).Readable) {
                (_a = this.fd) === null || _a === void 0 ? void 0 : _a.append(key, {
                    type: undefined,
                    name: fileName,
                    [Symbol.toStringTag]: "File",
                    stream() {
                        return value;
                    },
                });
            }
            else {
                (_b = this.fd) === null || _b === void 0 ? void 0 : _b.append(key, value, fileName);
            }
        });
    }
    getRequest() {
        return __awaiter(this, void 0, void 0, function* () {
            const encoder = new (yield Promise.resolve().then(() => __importStar(require("form-data-encoder")))).FormDataEncoder(this.fd);
            return {
                body: yield (yield Promise.resolve().then(() => __importStar(require("readable-stream")))).Readable.from(encoder),
                headers: encoder.headers,
                duplex: "half",
            };
        });
    }
}
exports.Node18FormData = Node18FormData;
/**
 * Form Data Implementation for Node.js 16-18
 */
class Node16FormData {
    setup() {
        return __awaiter(this, void 0, void 0, function* () {
            this.fd = new (yield Promise.resolve().then(() => __importStar(require("form-data")))).default();
        });
    }
    append(key, value) {
        var _a;
        (_a = this.fd) === null || _a === void 0 ? void 0 : _a.append(key, value);
    }
    appendFile(key, value, fileName) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            if (fileName == null && isNamedValue(value)) {
                fileName = value.name;
            }
            let bufferedValue;
            if (!(value instanceof (yield Promise.resolve().then(() => __importStar(require("readable-stream")))).Readable)) {
                bufferedValue = Buffer.from(yield value.arrayBuffer());
            }
            else {
                bufferedValue = value;
            }
            if (fileName == null) {
                (_a = this.fd) === null || _a === void 0 ? void 0 : _a.append(key, bufferedValue);
            }
            else {
                (_b = this.fd) === null || _b === void 0 ? void 0 : _b.append(key, bufferedValue, { filename: fileName });
            }
        });
    }
    getRequest() {
        return {
            body: this.fd,
            headers: this.fd ? this.fd.getHeaders() : {},
        };
    }
}
exports.Node16FormData = Node16FormData;
/**
 * Form Data Implementation for Web
 */
class WebFormData {
    setup() {
        return __awaiter(this, void 0, void 0, function* () {
            this.fd = new FormData();
        });
    }
    append(key, value) {
        var _a;
        (_a = this.fd) === null || _a === void 0 ? void 0 : _a.append(key, value);
    }
    appendFile(key, value, fileName) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (fileName == null && isNamedValue(value)) {
                fileName = value.name;
            }
            (_a = this.fd) === null || _a === void 0 ? void 0 : _a.append(key, new Blob([value]), fileName);
        });
    }
    getRequest() {
        return {
            body: this.fd,
            headers: {},
        };
    }
}
exports.WebFormData = WebFormData;
