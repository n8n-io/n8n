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
exports.parseBuffer = parseBuffer;
exports.parseString = parseString;
exports.unset = unset;
exports.parseFromFilesSync = parseFromFilesSync;
exports.parseFromFiles = parseFromFiles;
exports.parse = parse;
exports.parseSync = parseSync;
exports.matcher = matcher;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const semver = __importStar(require("semver"));
const wasm_1 = require("@one-ini/wasm");
const node_buffer_1 = require("node:buffer");
const minimatch_1 = require("minimatch");
const package_json_1 = __importDefault(require("../package.json"));
const escapedSep = new RegExp(path.sep.replace(/\\/g, '\\\\'), 'g');
const matchOptions = { matchBase: true, dot: true };
const knownPropNames = [
    'end_of_line',
    'indent_style',
    'indent_size',
    'insert_final_newline',
    'trim_trailing_whitespace',
    'charset',
];
const knownProps = new Set(knownPropNames);
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
/**
 * Parses a string.  If possible, you should always use ParseBuffer instead,
 * since this function does a UTF16-to-UTF8 conversion first.
 *
 * @param data String to parse.
 * @returns Parsed contents.  Will be truncated if there was a parse error.
 * @deprecated Use {@link ParseBuffer} instead.
 */
function parseString(data) {
    return parseBuffer(node_buffer_1.Buffer.from(data));
}
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
    if ('indent_style' in matches &&
        matches.indent_style === 'tab' &&
        !('indent_size' in matches) &&
        semver.gte(version, '0.10.0')) {
        matches.indent_size = 'tab';
    }
    // Set tab_width to indent_size if indent_size is specified and
    // tab_width is unspecified
    if ('indent_size' in matches &&
        !('tab_width' in matches) &&
        matches.indent_size !== 'tab') {
        matches.tab_width = matches.indent_size;
    }
    // Set indent_size to tab_width if indent_size is 'tab'
    if ('indent_size' in matches &&
        'tab_width' in matches &&
        matches.indent_size === 'tab') {
        matches.indent_size = matches.tab_width;
    }
    return matches;
}
function buildFullGlob(pathPrefix, glob) {
    switch (glob.indexOf('/')) {
        case -1:
            glob = `**/${glob}`;
            break;
        case 0:
            glob = glob.substring(1);
            break;
        default:
            break;
    }
    //
    // braces_escaped_backslash2
    // backslash_not_on_windows
    glob = glob.replace(/\\\\/g, '\\\\\\\\');
    //
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
        if (Object.prototype.hasOwnProperty.call(options, key)) {
            const value = options[key];
            const key2 = key.toLowerCase();
            let value2 = value;
            if (knownProps.has(key2)) {
                // All of the values for the known props are lowercase.
                value2 = String(value).toLowerCase();
            }
            try {
                value2 = JSON.parse(String(value));
            }
            catch (_e) {
                // Ignored
            }
            if (typeof value2 === 'undefined' || value2 === null) {
                //
                // null and undefined are values specific to JSON (no special meaning
                // in editorconfig) & should just be returned as regular strings.
                value2 = String(value);
            }
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
    let res = undefined;
    // eslint-disable-next-line no-negated-condition
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
            root: Boolean(globbed[0][1].root), // Global section: globbed[0]
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
    let contents = undefined;
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
            unset: options.unset,
        },
    ];
}
/**
 * For any pair, a value of `unset` removes the effect of that pair, even if
 * it has been set before.  This method modifies the properties object in
 * place to remove any property that has a value of `unset`.
 *
 * @param props Properties object to modify.
 */
function unset(props) {
    const keys = Object.keys(props);
    for (const k of keys) {
        if (props[k] === 'unset') {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete props[k];
        }
    }
}
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
            if (glob === null || glob === void 0 ? void 0 : glob.match(filepath)) {
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
    if (options.unset) {
        unset(ret);
    }
    return processMatches(ret, options.version);
}
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
        let cfg = undefined;
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
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    return parseFromFilesSync(filepath, await files, options);
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
/**
 * I think this may be of limited utility at the moment, but I need something
 * like this for testing.  As such, the interface of this may change without
 * warning.
 *
 * Something this direction may be better for editors than the caching bits
 * we've got today, but that will need some thought.
 *
 * @param options All options.  root will be process.cwd if not specified.
 * @param buffers 1 or more Buffers that have .editorconfig contents.
 * @returns Function that can be called multiple times for different paths.
 * @private
 */
function matcher(options, ...buffers) {
    const [_fileName, processedOptions] = opts('', options);
    const configs = buffers.map((buf, i) => processFileContents(path.join(processedOptions.root, `buffer-${i}`), buf, processedOptions));
    return (filepath) => {
        const resolvedFilePath = path.resolve(filepath);
        return combine(resolvedFilePath, configs, processedOptions);
    };
}
