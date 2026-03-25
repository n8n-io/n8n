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
exports.parseSync = exports.parse = exports.parseFromFilesSync = exports.parseFromFiles = exports.parseString = exports.parseBuffer = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const semver = __importStar(require("semver"));
const minimatch_1 = require("minimatch");
const wasm_1 = require("@one-ini/wasm");
// @ts-ignore So we can set the rootDir to be 'lib', without processing
// package.json
const package_json_1 = __importDefault(require("../package.json"));
const escapedSep = new RegExp(path.sep.replace(/\\/g, '\\\\'), 'g');
const matchOptions = { matchBase: true, dot: true, noext: true };
// These are specified by the editorconfig script
/* eslint-disable @typescript-eslint/naming-convention */
const knownProps = {
    end_of_line: true,
    indent_style: true,
    indent_size: true,
    insert_final_newline: true,
    trim_trailing_whitespace: true,
    charset: true,
};
/**
 * Parse a buffer using the faster one-ini WASM approach into something
 * relatively easy to deal with in JS.
 *
 * @param data UTF8-encoded bytes.
 * @returns Parsed contents.  Will be truncated if there was a parse error.
 */
function parseBuffer(data) {
    const parsed = (0, wasm_1.parse_to_uint32array)(data);
    let cur = {};
    const res = [[null, cur]];
    let key = null;
    for (let i = 0; i < parsed.length; i += 3) {
        switch (parsed[i]) {
            case wasm_1.TokenTypes.Section: {
                cur = {};
                res.push([
                    data.toString('utf8', parsed[i + 1], parsed[i + 2]),
                    cur,
                ]);
                break;
            }
            case wasm_1.TokenTypes.Key:
                key = data.toString('utf8', parsed[i + 1], parsed[i + 2]);
                break;
            case wasm_1.TokenTypes.Value: {
                cur[key] = data.toString('utf8', parsed[i + 1], parsed[i + 2]);
                break;
            }
            default: // Comments, etc.
                break;
        }
    }
    return res;
}
exports.parseBuffer = parseBuffer;
/**
 * Parses a string.  If possible, you should always use ParseBuffer instead,
 * since this function does a UTF16-to-UTF8 conversion first.
 *
 * @param data String to parse.
 * @returns Parsed contents.  Will be truncated if there was a parse error.
 * @deprecated Use {@link ParseBuffer} instead.
 */
function parseString(data) {
    return parseBuffer(Buffer.from(data));
}
exports.parseString = parseString;
/**
 * Gets a list of *potential* filenames based on the path of the target
 * filename.
 *
 * @param filepath File we are asking about.
 * @param options Config file name and root directory
 * @returns List of potential fully-qualified filenames that might have configs.
 */
function getConfigFileNames(filepath, options) {
    const paths = [];
    do {
        filepath = path.dirname(filepath);
        paths.push(path.join(filepath, options.config));
    } while (filepath !== options.root);
    return paths;
}
/**
 * Take a combined config for the target file, and tweak it slightly based on
 * which editorconfig version's rules we are using.
 *
 * @param matches Combined config.
 * @param version Editorconfig version to enforce.
 * @returns The passed-in matches object, modified in place.
 */
function processMatches(matches, version) {
    // Set indent_size to 'tab' if indent_size is unspecified and
    // indent_style is set to 'tab'.
    if ('indent_style' in matches
        && matches.indent_style === 'tab'
        && !('indent_size' in matches)
        && semver.gte(version, '0.10.0')) {
        matches.indent_size = 'tab';
    }
    // Set tab_width to indent_size if indent_size is specified and
    // tab_width is unspecified
    if ('indent_size' in matches
        && !('tab_width' in matches)
        && matches.indent_size !== 'tab') {
        matches.tab_width = matches.indent_size;
    }
    // Set indent_size to tab_width if indent_size is 'tab'
    if ('indent_size' in matches
        && 'tab_width' in matches
        && matches.indent_size === 'tab') {
        matches.indent_size = matches.tab_width;
    }
    return matches;
}
function buildFullGlob(pathPrefix, glob) {
    switch (glob.indexOf('/')) {
        case -1:
            glob = '**/' + glob;
            break;
        case 0:
            glob = glob.substring(1);
            break;
        default:
            break;
    }
    // braces_escaped_backslash2
    // backslash_not_on_windows
    glob = glob.replace(/\\\\/g, '\\\\\\\\');
    // star_star_over_separator{1,3,5,6,9,15}
    glob = glob.replace(/\*\*/g, '{*,**/**/**}');
    // NOT path.join.  Must stay in forward slashes.
    return new minimatch_1.Minimatch(`${pathPrefix}/${glob}`, matchOptions);
}
/**
 * Normalize the properties read from a config file so that their key names
 * are lowercased for the known properties, and their values are parsed into
 * the correct JS types if possible.
 *
 * @param options
 * @returns
 */
function normalizeProps(options) {
    const props = {};
    for (const key in options) {
        if (options.hasOwnProperty(key)) {
            const value = options[key];
            const key2 = key.toLowerCase();
            let value2 = value;
            // @ts-ignore -- Fix types here
            if (knownProps[key2]) {
                // All of the values for the known props are lowercase.
                value2 = String(value).toLowerCase();
            }
            try {
                value2 = JSON.parse(String(value));
            }
            catch (e) { }
            if (typeof value2 === 'undefined' || value2 === null) {
                // null and undefined are values specific to JSON (no special meaning
                // in editorconfig) & should just be returned as regular strings.
                value2 = String(value);
            }
            // @ts-ignore -- Fix types here
            props[key2] = value2;
        }
    }
    return props;
}
/**
 * Take the contents of a config file, and prepare it for use.  If a cache is
 * provided, the result will be stored there.  As such, all of the higher-CPU
 * work that is per-file should be done here.
 *
 * @param filepath The fully-qualified path of the file.
 * @param contents The contents as read from that file.
 * @param options Access to the cache.
 * @returns Processed file with globs pre-computed.
 */
function processFileContents(filepath, contents, options) {
    let res;
    if (!contents) {
        // Negative cache
        res = {
            root: false,
            notfound: true,
            name: filepath,
            config: [[null, {}, null]],
        };
    }
    else {
        let pathPrefix = path.dirname(filepath);
        if (path.sep !== '/') {
            // Windows-only
            pathPrefix = pathPrefix.replace(escapedSep, '/');
        }
        // After Windows path backslash's are turned into slashes, so that
        // the backslashes we add here aren't turned into forward slashes:
        // All of these characters are special to minimatch, but can be
        // forced into path names on many file systems.  Escape them. Note
        // that these are in the order of the case statement in minimatch.
        pathPrefix = pathPrefix.replace(/[?*+@!()|[\]{}]/g, '\\$&');
        // I can't think of a way for this to happen in the filesystems I've
        // seen (because of the path.dirname above), but let's be thorough.
        pathPrefix = pathPrefix.replace(/^#/, '\\#');
        const globbed = parseBuffer(contents).map(([name, body]) => [
            name,
            normalizeProps(body),
            name ? buildFullGlob(pathPrefix, name) : null,
        ]);
        res = {
            root: !!globbed[0][1].root,
            name: filepath,
            config: globbed,
        };
    }
    if (options.cache) {
        options.cache.set(filepath, res);
    }
    return res;
}
/**
 * Get a file from the cache, or read its contents from disk, process, and
 * insert into the cache (if configured).
 *
 * @param filepath The fully-qualified path of the config file.
 * @param options Access to the cache, if configured.
 * @returns The processed file, or undefined if there was an error reading it.
 */
async function getConfig(filepath, options) {
    if (options.cache) {
        const cached = options.cache.get(filepath);
        if (cached) {
            return cached;
        }
    }
    const contents = await new Promise(resolve => {
        fs.readFile(filepath, (_, buf) => {
            // Ignore errors.  contents will be undefined
            // Perhaps only file-not-found should be ignored?
            resolve(buf);
        });
    });
    return processFileContents(filepath, contents, options);
}
/**
 * Get a file from the cache, or read its contents from disk, process, and
 * insert into the cache (if configured).  Synchronous.
 *
 * @param filepath The fully-qualified path of the config file.
 * @param options Access to the cache, if configured.
 * @returns The processed file, or undefined if there was an error reading it.
 */
function getConfigSync(filepath, options) {
    if (options.cache) {
        const cached = options.cache.get(filepath);
        if (cached) {
            return cached;
        }
    }
    let contents;
    try {
        contents = fs.readFileSync(filepath);
    }
    catch (_) {
        // Ignore errors
        // Perhaps only file-not-found should be ignored
    }
    return processFileContents(filepath, contents, options);
}
/**
 * Get all of the possibly-existing config files, stopping when one is marked
 * root=true.
 *
 * @param files List of potential files
 * @param options Access to cache if configured
 * @returns List of processed configs for existing files
 */
async function getAllConfigs(files, options) {
    const configs = [];
    for (const file of files) {
        const config = await getConfig(file, options);
        if (!config.notfound) {
            configs.push(config);
            if (config.root) {
                break;
            }
        }
    }
    return configs;
}
/**
 * Get all of the possibly-existing config files, stopping when one is marked
 * root=true.  Synchronous.
 *
 * @param files List of potential files
 * @param options Access to cache if configured
 * @returns List of processed configs for existing files
 */
function getAllConfigsSync(files, options) {
    const configs = [];
    for (const file of files) {
        const config = getConfigSync(file, options);
        if (!config.notfound) {
            configs.push(config);
            if (config.root) {
                break;
            }
        }
    }
    return configs;
}
/**
 * Normalize the options passed in to the publicly-visible functions.
 *
 * @param filepath The name of the target file, relative to process.cwd().
 * @param options Potentially-incomplete options.
 * @returns The fully-qualified target file name and the normalized options.
 */
function opts(filepath, options = {}) {
    const resolvedFilePath = path.resolve(filepath);
    return [
        resolvedFilePath,
        {
            config: options.config || '.editorconfig',
            version: options.version || package_json_1.default.version,
            root: path.resolve(options.root || path.parse(resolvedFilePath).root),
            files: options.files,
            cache: options.cache,
        },
    ];
}
/**
 * Low-level interface, which exists only for backward-compatibility.
 * Deprecated.
 *
 * @param filepath The name of the target file, relative to process.cwd().
 * @param files A promise for a list of objects describing the files.
 * @param options All options
 * @returns The properties found for filepath
 * @deprecated
 */
async function parseFromFiles(filepath, files, options = {}) {
    return parseFromFilesSync(filepath, await files, options);
}
exports.parseFromFiles = parseFromFiles;
/**
 * Low-level interface, which exists only for backward-compatibility.
 * Deprecated.
 *
 * @param filepath The name of the target file, relative to process.cwd().
 * @param files A list of objects describing the files.
 * @param options All options
 * @returns The properties found for filepath
 * @deprecated
 */
function parseFromFilesSync(filepath, files, options = {}) {
    const [resolvedFilePath, processedOptions] = opts(filepath, options);
    const configs = [];
    for (const ecf of files) {
        let cfg;
        if (!options.cache || !(cfg = options.cache.get(ecf.name))) { // Single "="!
            cfg = processFileContents(ecf.name, ecf.contents, processedOptions);
        }
        if (!cfg.notfound) {
            configs.push(cfg);
        }
        if (cfg.root) {
            break;
        }
    }
    return combine(resolvedFilePath, configs, processedOptions);
}
exports.parseFromFilesSync = parseFromFilesSync;
/**
 * Combine the pre-parsed results of all matching config file sections, in
 * order.
 *
 * @param filepath The target file path
 * @param configs All of the found config files, up to the root
 * @param options Adds to `options.files` if it exists
 * @returns Combined properties
 */
function combine(filepath, configs, options) {
    const ret = configs.reverse().reduce((props, processed) => {
        for (const [name, body, glob] of processed.config) {
            if (glob && glob.match(filepath)) {
                Object.assign(props, body);
                if (options.files) {
                    options.files.push({
                        fileName: processed.name,
                        glob: name,
                    });
                }
            }
        }
        return props;
    }, {});
    return processMatches(ret, options.version);
}
/**
 * Find all of the properties from matching sections in config files in the
 * same directory or toward the root of the filesystem.
 *
 * @param filepath The target file name, relative to process.cwd().
 * @param options All options
 * @returns Combined properties for the target file
 */
async function parse(filepath, options = {}) {
    const [resolvedFilePath, processedOptions] = opts(filepath, options);
    const filepaths = getConfigFileNames(resolvedFilePath, processedOptions);
    const configs = await getAllConfigs(filepaths, processedOptions);
    return combine(resolvedFilePath, configs, processedOptions);
}
exports.parse = parse;
/**
 * Find all of the properties from matching sections in config files in the
 * same directory or toward the root of the filesystem.  Synchronous.
 *
 * @param filepath The target file name, relative to process.cwd().
 * @param options All options
 * @returns Combined properties for the target file
 */
function parseSync(filepath, options = {}) {
    const [resolvedFilePath, processedOptions] = opts(filepath, options);
    const filepaths = getConfigFileNames(resolvedFilePath, processedOptions);
    const configs = getAllConfigsSync(filepaths, processedOptions);
    return combine(resolvedFilePath, configs, processedOptions);
}
exports.parseSync = parseSync;
