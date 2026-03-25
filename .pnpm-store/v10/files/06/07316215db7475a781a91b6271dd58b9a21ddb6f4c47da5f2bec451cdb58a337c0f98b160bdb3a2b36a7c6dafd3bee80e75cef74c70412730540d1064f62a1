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
const parser_1 = require("@babel/parser");
const babel_walk_1 = require("babel-walk");
const t = __importStar(require("@babel/types"));
const globals_1 = __importDefault(require("./globals"));
const parseOptions = {
    allowReturnOutsideFunction: true,
    allowImportExportEverywhere: true,
};
/**
 * Mimic `with` as far as possible but at compile time
 *
 * @param obj The object part of a with expression
 * @param src The body of the with expression
 * @param exclude A list of variable names to explicitly exclude
 */
function addWith(obj, src, exclude = []) {
    // tslint:disable-next-line: no-parameter-reassignment
    obj = obj + '';
    // tslint:disable-next-line: no-parameter-reassignment
    src = src + '';
    let ast;
    try {
        ast = parser_1.parse(src, parseOptions);
    }
    catch (e) {
        throw Object.assign(new Error('Error parsing body of the with expression'), {
            component: 'src',
            babylonError: e,
        });
    }
    let objAst;
    try {
        objAst = parser_1.parse(obj, parseOptions);
    }
    catch (e) {
        throw Object.assign(new Error('Error parsing object part of the with expression'), {
            component: 'obj',
            babylonError: e,
        });
    }
    const excludeSet = new Set([
        'undefined',
        'this',
        ...exclude,
        ...globals_1.default(objAst).map((g) => g.name),
    ]);
    const vars = new Set(globals_1.default(ast)
        .map((global) => global.name)
        .filter((v) => !excludeSet.has(v)));
    if (vars.size === 0)
        return src;
    let declareLocal = '';
    let local = 'locals_for_with';
    let result = 'result_of_with';
    if (t.isValidIdentifier(obj)) {
        local = obj;
    }
    else {
        while (vars.has(local) || excludeSet.has(local)) {
            local += '_';
        }
        declareLocal = `var ${local} = (${obj});`;
    }
    while (vars.has(result) || excludeSet.has(result)) {
        result += '_';
    }
    const args = [
        'this',
        ...Array.from(vars).map((v) => `${JSON.stringify(v)} in ${local} ?
        ${local}.${v} :
        typeof ${v} !== 'undefined' ? ${v} : undefined`),
    ];
    const unwrapped = unwrapReturns(ast, src, result);
    return `;
    ${declareLocal}
    ${unwrapped.before}
    (function (${Array.from(vars).join(', ')}) {
      ${unwrapped.body}
    }.call(${args.join(', ')}));
    ${unwrapped.after};`;
}
exports.default = addWith;
const unwrapReturnsVisitors = babel_walk_1.recursive({
    Function(_node, _state, _c) {
        // returns in these functions are not applicable
    },
    ReturnStatement(node, state) {
        state.hasReturn = true;
        let value = '';
        if (node.argument) {
            value = `value: (${state.source(node.argument)})`;
        }
        state.replace(node, `return {${value}};`);
    },
});
/**
 * Take a self calling function, and unwrap it such that return inside the function
 * results in return outside the function
 *
 * @param src    Some JavaScript code representing a self-calling function
 * @param result A temporary variable to store the result in
 */
function unwrapReturns(ast, src, result) {
    const charArray = src.split('');
    const state = {
        hasReturn: false,
        source(node) {
            return src.slice(node.start, node.end);
        },
        replace(node, str) {
            charArray.fill('', node.start, node.end);
            charArray[node.start] = str;
        },
    };
    unwrapReturnsVisitors(ast, state);
    return {
        before: state.hasReturn ? `var ${result} = ` : '',
        body: charArray.join(''),
        after: state.hasReturn ? `;if (${result}) return ${result}.value` : '',
    };
}
module.exports = addWith;
module.exports.default = addWith;
//# sourceMappingURL=index.js.map