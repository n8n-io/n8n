"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recursive = exports.ancestor = exports.simple = void 0;
const t = __importStar(require("@babel/types"));
const explode_1 = __importDefault(require("./explode"));
const VISITOR_KEYS = t.VISITOR_KEYS;
if (!(VISITOR_KEYS &&
    // tslint:disable-next-line: strict-type-predicates
    typeof VISITOR_KEYS === 'object' &&
    Object.keys(VISITOR_KEYS).every((key) => Array.isArray(VISITOR_KEYS[key]) &&
        // tslint:disable-next-line: strict-type-predicates
        VISITOR_KEYS[key].every((v) => typeof v === 'string')))) {
    throw new Error('@babel/types VISITOR_KEYS does not match the expected type.');
}
function simple(visitors) {
    const vis = explode_1.default(visitors);
    return (node, state) => {
        (function recurse(node) {
            if (!node)
                return;
            const visitor = vis[node.type];
            if (visitor === null || visitor === void 0 ? void 0 : visitor.enter) {
                for (const v of visitor.enter) {
                    v(node, state);
                }
            }
            for (const key of VISITOR_KEYS[node.type] || []) {
                const subNode = node[key];
                if (Array.isArray(subNode)) {
                    for (const subSubNode of subNode) {
                        recurse(subSubNode);
                    }
                }
                else {
                    recurse(subNode);
                }
            }
            if (visitor === null || visitor === void 0 ? void 0 : visitor.exit) {
                for (const v of visitor.exit) {
                    v(node, state);
                }
            }
        })(node);
    };
}
exports.simple = simple;
function ancestor(visitors) {
    const vis = explode_1.default(visitors);
    return (node, state) => {
        const ancestors = [];
        (function recurse(node) {
            if (!node)
                return;
            const visitor = vis[node.type];
            const isNew = node !== ancestors[ancestors.length - 1];
            if (isNew)
                ancestors.push(node);
            if (visitor === null || visitor === void 0 ? void 0 : visitor.enter) {
                for (const v of visitor.enter) {
                    v(node, state, ancestors);
                }
            }
            for (const key of VISITOR_KEYS[node.type] || []) {
                const subNode = node[key];
                if (Array.isArray(subNode)) {
                    for (const subSubNode of subNode) {
                        recurse(subSubNode);
                    }
                }
                else {
                    recurse(subNode);
                }
            }
            if (visitor === null || visitor === void 0 ? void 0 : visitor.exit) {
                for (const v of visitor.exit) {
                    v(node, state, ancestors);
                }
            }
            if (isNew)
                ancestors.pop();
        })(node);
    };
}
exports.ancestor = ancestor;
function recursive(visitors) {
    const vis = explode_1.default(visitors);
    return (node, state) => {
        (function recurse(node) {
            if (!node)
                return;
            const visitor = vis[node.type];
            if (visitor === null || visitor === void 0 ? void 0 : visitor.enter) {
                for (const v of visitor.enter) {
                    v(node, state, recurse);
                }
            }
            else {
                for (const key of VISITOR_KEYS[node.type] || []) {
                    const subNode = node[key];
                    if (Array.isArray(subNode)) {
                        for (const subSubNode of subNode) {
                            recurse(subSubNode);
                        }
                    }
                    else {
                        recurse(subNode);
                    }
                }
            }
        })(node);
    };
}
exports.recursive = recursive;
//# sourceMappingURL=index.js.map