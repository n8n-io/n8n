"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.load = exports.merge = exports.contains = void 0;
/**
 * @file Alternative entry point for Cheerio that always uses htmlparser2. This
 *   way, parse5 won't be loaded, saving some memory.
 */
const load_js_1 = require("./load.js");
const parse_js_1 = require("./parse.js");
const dom_serializer_1 = __importDefault(require("dom-serializer"));
const htmlparser2_1 = require("htmlparser2");
var static_js_1 = require("./static.js");
Object.defineProperty(exports, "contains", { enumerable: true, get: function () { return static_js_1.contains; } });
Object.defineProperty(exports, "merge", { enumerable: true, get: function () { return static_js_1.merge; } });
/**
 * Create a querying function, bound to a document created from the provided
 * markup.
 *
 * @param content - Markup to be loaded.
 * @param options - Options for the created instance.
 * @param isDocument - Always `false` here, as we are always using
 *   `htmlparser2`.
 * @returns The loaded document.
 * @see {@link https://cheerio.js.org#loading} for additional usage information.
 */
exports.load = (0, load_js_1.getLoad)((0, parse_js_1.getParse)(htmlparser2_1.parseDocument), dom_serializer_1.default);
//# sourceMappingURL=slim.js.map