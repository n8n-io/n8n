"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.traverse = void 0;
var pug = __importStar(require("pug"));
var compiler_dom_1 = require("@vue/compiler-dom");
var cacher_1 = __importDefault(require("./utils/cacher"));
function parseTemplate(tpl, documentation, handlers, opts) {
    var filePath = opts.filePath, pugOptions = opts.pugOptions;
    if (tpl && tpl.content) {
        var source_1 = tpl.attrs && tpl.attrs.lang === 'pug'
            ? pug.render(tpl.content.trim(), __assign(__assign({ doctype: 'html' }, pugOptions), { filename: filePath }))
            : tpl.content;
        var ast_1 = (0, cacher_1.default)(function () { return (0, compiler_dom_1.parse)(source_1, { comments: true }); }, source_1);
        var functional_1 = !!tpl.attrs.functional;
        if (functional_1) {
            documentation.set('functional', functional_1);
        }
        if (ast_1) {
            ast_1.children.forEach(function (child) {
                return traverse(child, documentation, handlers, ast_1.children, {
                    functional: functional_1
                });
            });
        }
    }
}
exports.default = parseTemplate;
function hasChildren(child) {
    return !!child.children;
}
function traverse(templateAst, documentation, handlers, siblings, options) {
    var traverseAstChildren = function (ast) {
        var e_1, _a;
        if (hasChildren(ast)) {
            var children = ast.children;
            try {
                for (var children_1 = __values(children), children_1_1 = children_1.next(); !children_1_1.done; children_1_1 = children_1.next()) {
                    var childNode = children_1_1.value;
                    traverse(childNode, documentation, handlers, children, options);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (children_1_1 && !children_1_1.done && (_a = children_1.return)) _a.call(children_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
    };
    handlers.forEach(function (handler) {
        handler(documentation, templateAst, siblings, options);
    });
    traverseAstChildren(templateAst);
}
exports.traverse = traverse;
