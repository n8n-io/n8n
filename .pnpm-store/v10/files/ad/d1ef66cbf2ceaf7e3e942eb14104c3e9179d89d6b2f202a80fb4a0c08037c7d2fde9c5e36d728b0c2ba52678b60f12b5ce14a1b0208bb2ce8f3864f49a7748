"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "normalizeConfig", {
    enumerable: true,
    get: function() {
        return normalizeConfig;
    }
});
const _featureFlags = require("../featureFlags");
const _log = /*#__PURE__*/ _interop_require_wildcard(require("./log"));
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {};
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
function normalizeConfig(config) {
    // Quick structure validation
    /**
   * type FilePath = string
   * type RawFile = { raw: string, extension?: string }
   * type ExtractorFn = (content: string) => Array<string>
   * type TransformerFn = (content: string) => string
   *
   * type Content =
   *   | Array<FilePath | RawFile>
   *   | {
   *       files: Array<FilePath | RawFile>,
   *       extract?: ExtractorFn | { [extension: string]: ExtractorFn }
   *       transform?: TransformerFn | { [extension: string]: TransformerFn }
   *   }
   */ let valid = (()=>{
        // `config.purge` should not exist anymore
        if (config.purge) {
            return false;
        }
        // `config.content` should exist
        if (!config.content) {
            return false;
        }
        // `config.content` should be an object or an array
        if (!Array.isArray(config.content) && !(typeof config.content === "object" && config.content !== null)) {
            return false;
        }
        // When `config.content` is an array, it should consist of FilePaths or RawFiles
        if (Array.isArray(config.content)) {
            return config.content.every((path)=>{
                // `path` can be a string
                if (typeof path === "string") return true;
                // `path` can be an object { raw: string, extension?: string }
                // `raw` must be a string
                if (typeof (path === null || path === void 0 ? void 0 : path.raw) !== "string") return false;
                // `extension` (if provided) should also be a string
                if ((path === null || path === void 0 ? void 0 : path.extension) && typeof (path === null || path === void 0 ? void 0 : path.extension) !== "string") {
                    return false;
                }
                return true;
            });
        }
        // When `config.content` is an object
        if (typeof config.content === "object" && config.content !== null) {
            // Only `files`, `relative`, `extract`, and `transform` can exist in `config.content`
            if (Object.keys(config.content).some((key)=>![
                    "files",
                    "relative",
                    "extract",
                    "transform"
                ].includes(key))) {
                return false;
            }
            // `config.content.files` should exist of FilePaths or RawFiles
            if (Array.isArray(config.content.files)) {
                if (!config.content.files.every((path)=>{
                    // `path` can be a string
                    if (typeof path === "string") return true;
                    // `path` can be an object { raw: string, extension?: string }
                    // `raw` must be a string
                    if (typeof (path === null || path === void 0 ? void 0 : path.raw) !== "string") return false;
                    // `extension` (if provided) should also be a string
                    if ((path === null || path === void 0 ? void 0 : path.extension) && typeof (path === null || path === void 0 ? void 0 : path.extension) !== "string") {
                        return false;
                    }
                    return true;
                })) {
                    return false;
                }
                // `config.content.extract` is optional, and can be a Function or a Record<String, Function>
                if (typeof config.content.extract === "object") {
                    for (let value of Object.values(config.content.extract)){
                        if (typeof value !== "function") {
                            return false;
                        }
                    }
                } else if (!(config.content.extract === undefined || typeof config.content.extract === "function")) {
                    return false;
                }
                // `config.content.transform` is optional, and can be a Function or a Record<String, Function>
                if (typeof config.content.transform === "object") {
                    for (let value of Object.values(config.content.transform)){
                        if (typeof value !== "function") {
                            return false;
                        }
                    }
                } else if (!(config.content.transform === undefined || typeof config.content.transform === "function")) {
                    return false;
                }
                // `config.content.relative` is optional and can be a boolean
                if (typeof config.content.relative !== "boolean" && typeof config.content.relative !== "undefined") {
                    return false;
                }
            }
            return true;
        }
        return false;
    })();
    if (!valid) {
        _log.default.warn("purge-deprecation", [
            "The `purge`/`content` options have changed in Tailwind CSS v3.0.",
            "Update your configuration file to eliminate this warning.",
            "https://tailwindcss.com/docs/upgrade-guide#configure-content-sources"
        ]);
    }
    // Normalize the `safelist`
    config.safelist = (()=>{
        var _purge_options;
        let { content , purge , safelist  } = config;
        if (Array.isArray(safelist)) return safelist;
        if (Array.isArray(content === null || content === void 0 ? void 0 : content.safelist)) return content.safelist;
        if (Array.isArray(purge === null || purge === void 0 ? void 0 : purge.safelist)) return purge.safelist;
        if (Array.isArray(purge === null || purge === void 0 ? void 0 : (_purge_options = purge.options) === null || _purge_options === void 0 ? void 0 : _purge_options.safelist)) return purge.options.safelist;
        return [];
    })();
    // Normalize the `blocklist`
    config.blocklist = (()=>{
        let { blocklist  } = config;
        if (Array.isArray(blocklist)) {
            if (blocklist.every((item)=>typeof item === "string")) {
                return blocklist;
            }
            _log.default.warn("blocklist-invalid", [
                "The `blocklist` option must be an array of strings.",
                "https://tailwindcss.com/docs/content-configuration#discarding-classes"
            ]);
        }
        return [];
    })();
    // Normalize prefix option
    if (typeof config.prefix === "function") {
        _log.default.warn("prefix-function", [
            "As of Tailwind CSS v3.0, `prefix` cannot be a function.",
            "Update `prefix` in your configuration to be a string to eliminate this warning.",
            "https://tailwindcss.com/docs/upgrade-guide#prefix-cannot-be-a-function"
        ]);
        config.prefix = "";
    } else {
        var _config_prefix;
        config.prefix = (_config_prefix = config.prefix) !== null && _config_prefix !== void 0 ? _config_prefix : "";
    }
    // Normalize the `content`
    config.content = {
        relative: (()=>{
            let { content  } = config;
            if (content === null || content === void 0 ? void 0 : content.relative) {
                return content.relative;
            }
            return (0, _featureFlags.flagEnabled)(config, "relativeContentPathsByDefault");
        })(),
        files: (()=>{
            let { content , purge  } = config;
            if (Array.isArray(purge)) return purge;
            if (Array.isArray(purge === null || purge === void 0 ? void 0 : purge.content)) return purge.content;
            if (Array.isArray(content)) return content;
            if (Array.isArray(content === null || content === void 0 ? void 0 : content.content)) return content.content;
            if (Array.isArray(content === null || content === void 0 ? void 0 : content.files)) return content.files;
            return [];
        })(),
        extract: (()=>{
            let extract = (()=>{
                var _config_purge, _config_content, _config_purge1, _config_purge_extract, _config_content1, _config_content_extract, _config_purge2, _config_purge_options, _config_content2, _config_content_options;
                if ((_config_purge = config.purge) === null || _config_purge === void 0 ? void 0 : _config_purge.extract) return config.purge.extract;
                if ((_config_content = config.content) === null || _config_content === void 0 ? void 0 : _config_content.extract) return config.content.extract;
                if ((_config_purge1 = config.purge) === null || _config_purge1 === void 0 ? void 0 : (_config_purge_extract = _config_purge1.extract) === null || _config_purge_extract === void 0 ? void 0 : _config_purge_extract.DEFAULT) return config.purge.extract.DEFAULT;
                if ((_config_content1 = config.content) === null || _config_content1 === void 0 ? void 0 : (_config_content_extract = _config_content1.extract) === null || _config_content_extract === void 0 ? void 0 : _config_content_extract.DEFAULT) return config.content.extract.DEFAULT;
                if ((_config_purge2 = config.purge) === null || _config_purge2 === void 0 ? void 0 : (_config_purge_options = _config_purge2.options) === null || _config_purge_options === void 0 ? void 0 : _config_purge_options.extractors) return config.purge.options.extractors;
                if ((_config_content2 = config.content) === null || _config_content2 === void 0 ? void 0 : (_config_content_options = _config_content2.options) === null || _config_content_options === void 0 ? void 0 : _config_content_options.extractors) return config.content.options.extractors;
                return {};
            })();
            let extractors = {};
            let defaultExtractor = (()=>{
                var _config_purge, _config_purge_options, _config_content, _config_content_options;
                if ((_config_purge = config.purge) === null || _config_purge === void 0 ? void 0 : (_config_purge_options = _config_purge.options) === null || _config_purge_options === void 0 ? void 0 : _config_purge_options.defaultExtractor) {
                    return config.purge.options.defaultExtractor;
                }
                if ((_config_content = config.content) === null || _config_content === void 0 ? void 0 : (_config_content_options = _config_content.options) === null || _config_content_options === void 0 ? void 0 : _config_content_options.defaultExtractor) {
                    return config.content.options.defaultExtractor;
                }
                return undefined;
            })();
            if (defaultExtractor !== undefined) {
                extractors.DEFAULT = defaultExtractor;
            }
            // Functions
            if (typeof extract === "function") {
                extractors.DEFAULT = extract;
            } else if (Array.isArray(extract)) {
                for (let { extensions , extractor  } of extract !== null && extract !== void 0 ? extract : []){
                    for (let extension of extensions){
                        extractors[extension] = extractor;
                    }
                }
            } else if (typeof extract === "object" && extract !== null) {
                Object.assign(extractors, extract);
            }
            return extractors;
        })(),
        transform: (()=>{
            let transform = (()=>{
                var _config_purge, _config_content, _config_purge1, _config_purge_transform, _config_content1, _config_content_transform;
                if ((_config_purge = config.purge) === null || _config_purge === void 0 ? void 0 : _config_purge.transform) return config.purge.transform;
                if ((_config_content = config.content) === null || _config_content === void 0 ? void 0 : _config_content.transform) return config.content.transform;
                if ((_config_purge1 = config.purge) === null || _config_purge1 === void 0 ? void 0 : (_config_purge_transform = _config_purge1.transform) === null || _config_purge_transform === void 0 ? void 0 : _config_purge_transform.DEFAULT) return config.purge.transform.DEFAULT;
                if ((_config_content1 = config.content) === null || _config_content1 === void 0 ? void 0 : (_config_content_transform = _config_content1.transform) === null || _config_content_transform === void 0 ? void 0 : _config_content_transform.DEFAULT) return config.content.transform.DEFAULT;
                return {};
            })();
            let transformers = {};
            if (typeof transform === "function") {
                transformers.DEFAULT = transform;
            }
            if (typeof transform === "object" && transform !== null) {
                Object.assign(transformers, transform);
            }
            return transformers;
        })()
    };
    // Validate globs to prevent bogus globs.
    // E.g.: `./src/*.{html}` is invalid, the `{html}` should just be `html`
    for (let file of config.content.files){
        if (typeof file === "string" && /{([^,]*?)}/g.test(file)) {
            _log.default.warn("invalid-glob-braces", [
                `The glob pattern ${(0, _log.dim)(file)} in your Tailwind CSS configuration is invalid.`,
                `Update it to ${(0, _log.dim)(file.replace(/{([^,]*?)}/g, "$1"))} to silence this warning.`
            ]);
            break;
        }
    }
    return config;
}
