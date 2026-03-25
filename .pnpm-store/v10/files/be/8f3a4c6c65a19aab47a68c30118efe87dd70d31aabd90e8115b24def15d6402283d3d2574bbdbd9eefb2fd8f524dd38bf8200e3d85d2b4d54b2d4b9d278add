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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
var path = __importStar(require("path"));
var fs = __importStar(require("fs"));
function resolveAliases(filePath, aliases, refDirName) {
    var e_1, _a, e_2, _b;
    if (refDirName === void 0) { refDirName = ''; }
    var aliasKeys = Object.keys(aliases);
    var aliasResolved = null;
    if (!aliasKeys.length) {
        return filePath;
    }
    try {
        for (var aliasKeys_1 = __values(aliasKeys), aliasKeys_1_1 = aliasKeys_1.next(); !aliasKeys_1_1.done; aliasKeys_1_1 = aliasKeys_1.next()) {
            var aliasKey = aliasKeys_1_1.value;
            var aliasValueWithSlash = aliasKey + '/';
            var aliasMatch = filePath.substring(0, aliasValueWithSlash.length) === aliasValueWithSlash;
            var aliasValue = aliases[aliasKey];
            if (!aliasMatch) {
                continue;
            }
            if (!Array.isArray(aliasValue)) {
                aliasResolved = path.join(aliasValue, filePath.substring(aliasKey.length + 1));
                continue;
            }
            try {
                for (var aliasValue_1 = (e_2 = void 0, __values(aliasValue)), aliasValue_1_1 = aliasValue_1.next(); !aliasValue_1_1.done; aliasValue_1_1 = aliasValue_1.next()) {
                    var alias = aliasValue_1_1.value;
                    var absolutePath = path.resolve(refDirName, alias, filePath.substring(aliasKey.length + 1));
                    if (fs.existsSync(absolutePath)) {
                        aliasResolved = absolutePath;
                        break;
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (aliasValue_1_1 && !aliasValue_1_1.done && (_b = aliasValue_1.return)) _b.call(aliasValue_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (aliasKeys_1_1 && !aliasKeys_1_1.done && (_a = aliasKeys_1.return)) _a.call(aliasKeys_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return aliasResolved === null ?
        filePath :
        aliasResolved;
}
exports.default = resolveAliases;
