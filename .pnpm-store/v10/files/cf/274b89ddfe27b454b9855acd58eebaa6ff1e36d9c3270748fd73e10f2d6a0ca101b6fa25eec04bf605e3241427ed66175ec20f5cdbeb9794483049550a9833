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
exports.config = exports.compileBundleOptions = exports.isLocalFile = void 0;
const path = __importStar(require("path"));
exports.isLocalFile = /^\.{0,2}\//; // starts with '/' './' '../'
function compileBundleOptions(config) {
    return __awaiter(this, void 0, void 0, function* () {
        const f = config === undefined ? "." : config;
        try {
            const filepath = typeof f === "string" ? f : "spack.config.js";
            const fileModule = exports.isLocalFile.test(filepath)
                ? path.resolve(filepath)
                : filepath;
            let configFromFile = require(fileModule);
            if (configFromFile.default) {
                configFromFile = configFromFile.default;
            }
            if (Array.isArray(configFromFile)) {
                if (Array.isArray(f)) {
                    return [...configFromFile, ...f];
                }
                if (typeof f !== "string") {
                    configFromFile.push(f);
                }
                return configFromFile;
            }
            return Object.assign(Object.assign({}, configFromFile), (typeof config === "string" ? {} : config));
        }
        catch (e) {
            if (typeof f === "string") {
                throw new Error(`Error occurred while loading config file at ${config}: ${e}`);
            }
            return f;
        }
    });
}
exports.compileBundleOptions = compileBundleOptions;
/**
 * Usage: In `spack.config.js` / `spack.config.ts`, you can utilize type annotations (to get autocompletions) like
 *
 * ```ts
 * import { config } from '@swc/core/spack';
 *
 * export default config({
 *      name: 'web',
 * });
 * ```
 *
 *
 *
 */
function config(c) {
    return c;
}
exports.config = config;
