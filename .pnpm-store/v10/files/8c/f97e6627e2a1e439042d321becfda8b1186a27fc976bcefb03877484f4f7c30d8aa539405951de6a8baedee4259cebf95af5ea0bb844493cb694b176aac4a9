"use strict";
/* @flow */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultFilesystem = void 0;
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var assert_1 = __importDefault(require("assert"));
var sb_promise_queue_1 = require("sb-promise-queue");
exports.defaultFilesystem = {
    join: function (pathA, pathB) {
        return path_1.default.join(pathA, pathB);
    },
    basename: function (path) {
        return path_1.default.basename(path);
    },
    stat: function (path) {
        return new Promise(function (resolve, reject) {
            fs_1.default.stat(path, function (err, res) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(res);
                }
            });
        });
    },
    readdir: function (path) {
        return new Promise(function (resolve, reject) {
            fs_1.default.readdir(path, function (err, res) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(res);
                }
            });
        });
    },
};
function scanDirectoryInternal(_a) {
    var path = _a.path, recursive = _a.recursive, validate = _a.validate, result = _a.result, fileSystem = _a.fileSystem, queue = _a.queue, reject = _a.reject;
    return __awaiter(this, void 0, void 0, function () {
        var itemStat, contents;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, fileSystem.stat(path)];
                case 1:
                    itemStat = _b.sent();
                    if (itemStat.isFile()) {
                        result.files.push(path);
                    }
                    else if (itemStat.isDirectory()) {
                        result.directories.push(path);
                    }
                    if (!itemStat.isDirectory() || recursive === 'none') {
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, fileSystem.readdir(path)];
                case 2:
                    contents = _b.sent();
                    contents.forEach(function (item) {
                        var itemPath = fileSystem.join(path, item);
                        if (!validate(itemPath)) {
                            return;
                        }
                        queue
                            .add(function () {
                            return scanDirectoryInternal({
                                path: itemPath,
                                recursive: recursive === 'shallow' ? 'none' : 'deep',
                                validate: validate,
                                result: result,
                                fileSystem: fileSystem,
                                queue: queue,
                                reject: reject,
                            });
                        })
                            .catch(reject);
                    });
                    return [2 /*return*/];
            }
        });
    });
}
function scanDirectory(path, _a) {
    var _b = _a === void 0 ? {} : _a, _c = _b.recursive, recursive = _c === void 0 ? true : _c, _d = _b.validate, validate = _d === void 0 ? null : _d, _e = _b.concurrency, concurrency = _e === void 0 ? Infinity : _e, _f = _b.fileSystem, fileSystem = _f === void 0 ? exports.defaultFilesystem : _f;
    return __awaiter(this, void 0, void 0, function () {
        var queue, result, mergedFileSystem;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    assert_1.default(path && typeof path === 'string', 'path must be a valid string');
                    assert_1.default(typeof recursive === 'boolean', 'options.recursive must be a valid boolean');
                    assert_1.default(validate === null || typeof validate === 'function', 'options.validate must be a valid function');
                    assert_1.default(typeof concurrency === 'number', 'options.concurrency must be a valid number');
                    assert_1.default(fileSystem !== null && typeof fileSystem === 'object', 'options.fileSystem must be a valid object');
                    queue = new sb_promise_queue_1.PromiseQueue({
                        concurrency: concurrency,
                    });
                    result = { files: [], directories: [] };
                    mergedFileSystem = __assign(__assign({}, exports.defaultFilesystem), fileSystem);
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            scanDirectoryInternal({
                                path: path,
                                recursive: recursive ? 'deep' : 'shallow',
                                validate: validate != null ? validate : function (item) { return mergedFileSystem.basename(item).slice(0, 1) !== '.'; },
                                result: result,
                                fileSystem: mergedFileSystem,
                                queue: queue,
                                reject: reject,
                            })
                                .then(function () { return queue.waitTillIdle(); })
                                .then(resolve, reject);
                        })];
                case 1:
                    _g.sent();
                    return [2 /*return*/, result];
            }
        });
    });
}
exports.default = scanDirectory;
