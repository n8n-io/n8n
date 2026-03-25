"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return _default;
    }
});
const _dlv = /*#__PURE__*/ _interop_require_default(require("dlv"));
const _didyoumean = /*#__PURE__*/ _interop_require_default(require("didyoumean"));
const _transformThemeValue = /*#__PURE__*/ _interop_require_default(require("../util/transformThemeValue"));
const _index = /*#__PURE__*/ _interop_require_default(require("../value-parser/index"));
const _normalizeScreens = require("../util/normalizeScreens");
const _buildMediaQuery = /*#__PURE__*/ _interop_require_default(require("../util/buildMediaQuery"));
const _toPath = require("../util/toPath");
const _withAlphaVariable = require("../util/withAlphaVariable");
const _pluginUtils = require("../util/pluginUtils");
const _log = /*#__PURE__*/ _interop_require_default(require("../util/log"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function isObject(input) {
    return typeof input === "object" && input !== null;
}
function findClosestExistingPath(theme, path) {
    let parts = (0, _toPath.toPath)(path);
    do {
        parts.pop();
        if ((0, _dlv.default)(theme, parts) !== undefined) break;
    }while (parts.length);
    return parts.length ? parts : undefined;
}
function pathToString(path) {
    if (typeof path === "string") return path;
    return path.reduce((acc, cur, i)=>{
        if (cur.includes(".")) return `${acc}[${cur}]`;
        return i === 0 ? cur : `${acc}.${cur}`;
    }, "");
}
function list(items) {
    return items.map((key)=>`'${key}'`).join(", ");
}
function listKeys(obj) {
    return list(Object.keys(obj));
}
function validatePath(config, path, defaultValue, themeOpts = {}) {
    const pathString = Array.isArray(path) ? pathToString(path) : path.replace(/^['"]+|['"]+$/g, "");
    const pathSegments = Array.isArray(path) ? path : (0, _toPath.toPath)(pathString);
    const value = (0, _dlv.default)(config.theme, pathSegments, defaultValue);
    if (value === undefined) {
        let error = `'${pathString}' does not exist in your theme config.`;
        const parentSegments = pathSegments.slice(0, -1);
        const parentValue = (0, _dlv.default)(config.theme, parentSegments);
        if (isObject(parentValue)) {
            const validKeys = Object.keys(parentValue).filter((key)=>validatePath(config, [
                    ...parentSegments,
                    key
                ]).isValid);
            const suggestion = (0, _didyoumean.default)(pathSegments[pathSegments.length - 1], validKeys);
            if (suggestion) {
                error += ` Did you mean '${pathToString([
                    ...parentSegments,
                    suggestion
                ])}'?`;
            } else if (validKeys.length > 0) {
                error += ` '${pathToString(parentSegments)}' has the following valid keys: ${list(validKeys)}`;
            }
        } else {
            const closestPath = findClosestExistingPath(config.theme, pathString);
            if (closestPath) {
                const closestValue = (0, _dlv.default)(config.theme, closestPath);
                if (isObject(closestValue)) {
                    error += ` '${pathToString(closestPath)}' has the following keys: ${listKeys(closestValue)}`;
                } else {
                    error += ` '${pathToString(closestPath)}' is not an object.`;
                }
            } else {
                error += ` Your theme has the following top-level keys: ${listKeys(config.theme)}`;
            }
        }
        return {
            isValid: false,
            error
        };
    }
    if (!(typeof value === "string" || typeof value === "number" || typeof value === "function" || value instanceof String || value instanceof Number || Array.isArray(value))) {
        let error = `'${pathString}' was found but does not resolve to a string.`;
        if (isObject(value)) {
            let validKeys = Object.keys(value).filter((key)=>validatePath(config, [
                    ...pathSegments,
                    key
                ]).isValid);
            if (validKeys.length) {
                error += ` Did you mean something like '${pathToString([
                    ...pathSegments,
                    validKeys[0]
                ])}'?`;
            }
        }
        return {
            isValid: false,
            error
        };
    }
    const [themeSection] = pathSegments;
    return {
        isValid: true,
        value: (0, _transformThemeValue.default)(themeSection)(value, themeOpts)
    };
}
function extractArgs(node, vNodes, functions) {
    vNodes = vNodes.map((vNode)=>resolveVNode(node, vNode, functions));
    let args = [
        ""
    ];
    for (let vNode of vNodes){
        if (vNode.type === "div" && vNode.value === ",") {
            args.push("");
        } else {
            args[args.length - 1] += _index.default.stringify(vNode);
        }
    }
    return args;
}
function resolveVNode(node, vNode, functions) {
    if (vNode.type === "function" && functions[vNode.value] !== undefined) {
        let args = extractArgs(node, vNode.nodes, functions);
        vNode.type = "word";
        vNode.value = functions[vNode.value](node, ...args);
    }
    return vNode;
}
function resolveFunctions(node, input, functions) {
    let hasAnyFn = Object.keys(functions).some((fn)=>input.includes(`${fn}(`));
    if (!hasAnyFn) return input;
    return (0, _index.default)(input).walk((vNode)=>{
        resolveVNode(node, vNode, functions);
    }).toString();
}
let nodeTypePropertyMap = {
    atrule: "params",
    decl: "value"
};
/**
 * @param {string} path
 * @returns {Iterable<[path: string, alpha: string|undefined]>}
 */ function* toPaths(path) {
    // Strip quotes from beginning and end of string
    // This allows the alpha value to be present inside of quotes
    path = path.replace(/^['"]+|['"]+$/g, "");
    let matches = path.match(/^([^\s]+)(?![^\[]*\])(?:\s*\/\s*([^\/\s]+))$/);
    let alpha = undefined;
    yield [
        path,
        undefined
    ];
    if (matches) {
        path = matches[1];
        alpha = matches[2];
        yield [
            path,
            alpha
        ];
    }
}
/**
 *
 * @param {any} config
 * @param {string} path
 * @param {any} defaultValue
 */ function resolvePath(config, path, defaultValue) {
    const results = Array.from(toPaths(path)).map(([path, alpha])=>{
        return Object.assign(validatePath(config, path, defaultValue, {
            opacityValue: alpha
        }), {
            resolvedPath: path,
            alpha
        });
    });
    var _results_find;
    return (_results_find = results.find((result)=>result.isValid)) !== null && _results_find !== void 0 ? _results_find : results[0];
}
function _default(context) {
    let config = context.tailwindConfig;
    let functions = {
        theme: (node, path, ...defaultValue)=>{
            let { isValid , value , error , alpha  } = resolvePath(config, path, defaultValue.length ? defaultValue : undefined);
            if (!isValid) {
                var _parentNode_raws_tailwind;
                let parentNode = node.parent;
                let candidate = (_parentNode_raws_tailwind = parentNode === null || parentNode === void 0 ? void 0 : parentNode.raws.tailwind) === null || _parentNode_raws_tailwind === void 0 ? void 0 : _parentNode_raws_tailwind.candidate;
                if (parentNode && candidate !== undefined) {
                    // Remove this utility from any caches
                    context.markInvalidUtilityNode(parentNode);
                    // Remove the CSS node from the markup
                    parentNode.remove();
                    // Show a warning
                    _log.default.warn("invalid-theme-key-in-class", [
                        `The utility \`${candidate}\` contains an invalid theme value and was not generated.`
                    ]);
                    return;
                }
                throw node.error(error);
            }
            let maybeColor = (0, _pluginUtils.parseColorFormat)(value);
            let isColorFunction = maybeColor !== undefined && typeof maybeColor === "function";
            if (alpha !== undefined || isColorFunction) {
                if (alpha === undefined) {
                    alpha = 1.0;
                }
                value = (0, _withAlphaVariable.withAlphaValue)(maybeColor, alpha, maybeColor);
            }
            return value;
        },
        screen: (node, screen)=>{
            screen = screen.replace(/^['"]+/g, "").replace(/['"]+$/g, "");
            let screens = (0, _normalizeScreens.normalizeScreens)(config.theme.screens);
            let screenDefinition = screens.find(({ name  })=>name === screen);
            if (!screenDefinition) {
                throw node.error(`The '${screen}' screen does not exist in your theme.`);
            }
            return (0, _buildMediaQuery.default)(screenDefinition);
        }
    };
    return (root)=>{
        root.walk((node)=>{
            let property = nodeTypePropertyMap[node.type];
            if (property === undefined) {
                return;
            }
            node[property] = resolveFunctions(node, node[property], functions);
        });
    };
}
