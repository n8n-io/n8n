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
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripIdentifyingInformation = exports.getTmplDifference = void 0;
const tmpl = __importStar(require("@n8n_io/riot-tmpl"));
const recast_1 = require("recast");
const Differ_1 = require("./Differ");
const ExpressionBuilder_1 = require("./ExpressionBuilder");
const ExpressionSplitter_1 = require("./ExpressionSplitter");
const getTmplDifference = (expr, dataNodeName) => {
    if (!expr) {
        return { same: true };
    }
    if (tmpl.brackets.settings.brackets !== '{{ }}') {
        tmpl.brackets.set('{{ }}');
    }
    let tournParsed;
    let tmplParsed;
    let analysis;
    try {
        [tournParsed, analysis] = (0, ExpressionBuilder_1.getExpressionCode)(expr, dataNodeName, { before: [], after: [] });
    }
    catch (e) {
        tournParsed = null;
        analysis = null;
    }
    try {
        tmplParsed = tmpl.tmpl.getStr(expr);
    }
    catch (e) {
        tmplParsed = null;
    }
    if ((analysis === null || analysis === void 0 ? void 0 : analysis.has.function) || (analysis === null || analysis === void 0 ? void 0 : analysis.has.templateString)) {
        return {
            same: false,
            expression: (0, exports.stripIdentifyingInformation)(expr),
            has: analysis.has,
        };
    }
    if (tournParsed === null && tmplParsed === null) {
        return { same: true };
    }
    else if (tournParsed === null) {
        return {
            same: false,
            expression: 'UNPARSEABLE',
            parserError: {
                tmpl: false,
                tournament: true,
            },
        };
    }
    else if (tmplParsed === null) {
        return {
            same: false,
            expression: (0, exports.stripIdentifyingInformation)(expr),
            parserError: {
                tmpl: true,
                tournament: false,
            },
        };
    }
    const different = (0, Differ_1.isDifferent)(tmplParsed, tournParsed);
    if (different) {
        return {
            same: false,
            expression: (0, exports.stripIdentifyingInformation)(expr),
        };
    }
    return { same: true, expression: (0, exports.stripIdentifyingInformation)(expr) };
};
exports.getTmplDifference = getTmplDifference;
const CHAR_REPLACE = /\S/gu;
const replaceValue = (value) => {
    return value.replace(CHAR_REPLACE, 'v');
};
const stripIdentifyingInformation = (expr) => {
    const chunks = (0, ExpressionBuilder_1.getParsedExpression)(expr);
    for (const chunk of chunks) {
        if (chunk.type === 'text') {
            chunk.text = replaceValue(chunk.text);
        }
        else {
            (0, recast_1.visit)(chunk.parsed, {
                visitLiteral(path) {
                    this.traverse(path);
                    if (typeof path.node.value === 'string') {
                        path.node.value = replaceValue(path.node.value);
                    }
                },
                visitStringLiteral(path) {
                    this.traverse(path);
                    path.node.value = replaceValue(path.node.value);
                },
                visitTemplateElement(path) {
                    this.traverse(path);
                    if (path.node.value.cooked !== null) {
                        path.node.value.cooked = replaceValue(path.node.value.cooked);
                    }
                    path.node.value.raw = replaceValue(path.node.value.raw);
                },
            });
            chunk.text = (0, recast_1.print)(chunk.parsed).code;
        }
    }
    return {
        value: (0, ExpressionSplitter_1.joinExpression)(chunks),
        sanitized: 'ACTUALLY_SANITIZED_DO_NOT_MANUALLY_MAKE_THIS_OBJECT',
    };
};
exports.stripIdentifyingInformation = stripIdentifyingInformation;
//# sourceMappingURL=Analysis.js.map