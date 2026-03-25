"use strict";
/** @file Alternative Entry point for Cheerio, excluding parse5. */
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.load = void 0;
/**
 * Types used in signatures of Cheerio methods.
 *
 * @category Cheerio
 */
__exportStar(require("./types.js"), exports);
var load_js_1 = require("./load.js");
var parse_js_1 = require("./parse.js");
var dom_serializer_1 = __importDefault(require("dom-serializer"));
var htmlparser2_1 = require("htmlparser2");
/**
 * Create a querying function, bound to a document created from the provided markup.
 *
 * @param content - Markup to be loaded.
 * @param options - Options for the created instance.
 * @param isDocument - Always `false` here, as we are always using `htmlparser2`.
 * @returns The loaded document.
 * @see {@link https://cheerio.js.org#loading} for additional usage information.
 */
exports.load = (0, load_js_1.getLoad)((0, parse_js_1.getParse)(htmlparser2_1.parseDocument), dom_serializer_1.default);
//# sourceMappingURL=slim.js.map