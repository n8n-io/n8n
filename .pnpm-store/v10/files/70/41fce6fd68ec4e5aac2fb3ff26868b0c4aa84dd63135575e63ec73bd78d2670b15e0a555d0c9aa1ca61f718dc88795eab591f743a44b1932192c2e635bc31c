"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNewOptions = exports.getJsonSchemaRefParserDefaultOptions = void 0;
const json_js_1 = __importDefault(require("./parsers/json.js"));
const yaml_js_1 = __importDefault(require("./parsers/yaml.js"));
const text_js_1 = __importDefault(require("./parsers/text.js"));
const binary_js_1 = __importDefault(require("./parsers/binary.js"));
const file_js_1 = __importDefault(require("./resolvers/file.js"));
const http_js_1 = __importDefault(require("./resolvers/http.js"));
const getJsonSchemaRefParserDefaultOptions = () => {
    const defaults = {
        /**
         * Determines how different types of files will be parsed.
         *
         * You can add additional parsers of your own, replace an existing one with
         * your own implementation, or disable any parser by setting it to false.
         */
        parse: {
            json: { ...json_js_1.default },
            yaml: { ...yaml_js_1.default },
            text: { ...text_js_1.default },
            binary: { ...binary_js_1.default },
        },
        /**
         * Determines how JSON References will be resolved.
         *
         * You can add additional resolvers of your own, replace an existing one with
         * your own implementation, or disable any resolver by setting it to false.
         */
        resolve: {
            file: { ...file_js_1.default },
            http: { ...http_js_1.default },
            /**
             * Determines whether external $ref pointers will be resolved.
             * If this option is disabled, then none of above resolvers will be called.
             * Instead, external $ref pointers will simply be ignored.
             *
             * @type {boolean}
             */
            external: true,
        },
        /**
         * By default, JSON Schema $Ref Parser throws the first error it encounters. Setting `continueOnError` to `true`
         * causes it to keep processing as much as possible and then throw a single error that contains all errors
         * that were encountered.
         */
        continueOnError: false,
        /**
         * Determines the types of JSON references that are allowed.
         */
        dereference: {
            /**
             * Dereference circular (recursive) JSON references?
             * If false, then a {@link ReferenceError} will be thrown if a circular reference is found.
             * If "ignore", then circular references will not be dereferenced.
             *
             * @type {boolean|string}
             */
            circular: true,
            /**
             * A function, called for each path, which can return true to stop this path and all
             * subpaths from being dereferenced further. This is useful in schemas where some
             * subpaths contain literal $ref keys that should not be dereferenced.
             *
             * @type {function}
             */
            excludedPathMatcher: () => false,
            referenceResolution: "relative",
        },
        mutateInputSchema: true,
    };
    return defaults;
};
exports.getJsonSchemaRefParserDefaultOptions = getJsonSchemaRefParserDefaultOptions;
const getNewOptions = (options) => {
    const newOptions = (0, exports.getJsonSchemaRefParserDefaultOptions)();
    if (options) {
        merge(newOptions, options);
    }
    return newOptions;
};
exports.getNewOptions = getNewOptions;
/**
 * Merges the properties of the source object into the target object.
 *
 * @param target - The object that we're populating
 * @param source - The options that are being merged
 * @returns
 */
function merge(target, source) {
    if (isMergeable(source)) {
        // prevent prototype pollution
        const keys = Object.keys(source).filter((key) => !["__proto__", "constructor", "prototype"].includes(key));
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const sourceSetting = source[key];
            const targetSetting = target[key];
            if (isMergeable(sourceSetting)) {
                // It's a nested object, so merge it recursively
                target[key] = merge(targetSetting || {}, sourceSetting);
            }
            else if (sourceSetting !== undefined) {
                // It's a scalar value, function, or array. No merging necessary. Just overwrite the target value.
                target[key] = sourceSetting;
            }
        }
    }
    return target;
}
/**
 * Determines whether the given value can be merged,
 * or if it is a scalar value that should just override the target value.
 *
 * @param val
 * @returns
 */
function isMergeable(val) {
    return val && typeof val === "object" && !Array.isArray(val) && !(val instanceof RegExp) && !(val instanceof Date);
}
