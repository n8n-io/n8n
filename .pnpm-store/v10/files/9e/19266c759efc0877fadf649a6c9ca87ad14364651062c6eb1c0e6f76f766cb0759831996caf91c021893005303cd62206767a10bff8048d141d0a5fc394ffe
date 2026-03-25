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
const fs_1 = __importDefault(require("fs"));
const ono_1 = require("@jsdevtools/ono");
const url = __importStar(require("../util/url.js"));
const errors_js_1 = require("../util/errors.js");
exports.default = {
    /**
     * The order that this resolver will run, in relation to other resolvers.
     */
    order: 100,
    /**
     * Determines whether this resolver can read a given file reference.
     * Resolvers that return true will be tried, in order, until one successfully resolves the file.
     * Resolvers that return false will not be given a chance to resolve the file.
     */
    canRead(file) {
        return url.isFileSystemPath(file.url);
    },
    /**
     * Reads the given file and returns its raw contents as a Buffer.
     */
    async read(file) {
        let path;
        try {
            path = url.toFileSystemPath(file.url);
        }
        catch (err) {
            throw new errors_js_1.ResolverError(ono_1.ono.uri(err, `Malformed URI: ${file.url}`), file.url);
        }
        try {
            return await fs_1.default.promises.readFile(path);
        }
        catch (err) {
            throw new errors_js_1.ResolverError((0, ono_1.ono)(err, `Error opening file "${path}"`), path);
        }
    },
};
