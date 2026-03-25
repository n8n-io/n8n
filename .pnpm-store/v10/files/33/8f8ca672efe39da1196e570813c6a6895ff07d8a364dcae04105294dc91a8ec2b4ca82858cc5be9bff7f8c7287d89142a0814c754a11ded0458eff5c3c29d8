"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REQUIRED_SCENARIOS = exports.FRIENDLY_SUGGESTION_OBJECT_PARAMETER_LIST = exports.SUGGESTION_OBJECT_PARAMETERS = exports.FRIENDLY_ERROR_OBJECT_PARAMETER_LIST = exports.ERROR_OBJECT_PARAMETERS = exports.RULE_TESTER_PARAMETERS = void 0;
exports.sanitize = sanitize;
exports.wrapParser = wrapParser;
const typescript_estree_1 = require("@typescript-eslint/typescript-estree");
/*
 * List every parameters possible on a test case that are not related to eslint
 * configuration
 */
exports.RULE_TESTER_PARAMETERS = [
    'after',
    'before',
    'code',
    'defaultFilenames',
    'dependencyConstraints',
    'errors',
    'filename',
    'name',
    'only',
    'options',
    'output',
    'skip',
];
/*
 * All allowed property names in error objects.
 */
exports.ERROR_OBJECT_PARAMETERS = new Set([
    'column',
    'data',
    'endColumn',
    'endLine',
    'line',
    'message',
    'messageId',
    'suggestions',
    'type',
]);
exports.FRIENDLY_ERROR_OBJECT_PARAMETER_LIST = `[${[
    ...exports.ERROR_OBJECT_PARAMETERS,
]
    .map(key => `'${key}'`)
    .join(', ')}]`;
/*
 * All allowed property names in suggestion objects.
 */
exports.SUGGESTION_OBJECT_PARAMETERS = new Set([
    'data',
    'desc',
    'messageId',
    'output',
]);
exports.FRIENDLY_SUGGESTION_OBJECT_PARAMETER_LIST = `[${[
    ...exports.SUGGESTION_OBJECT_PARAMETERS,
]
    .map(key => `'${key}'`)
    .join(', ')}]`;
/**
 * Replace control characters by `\u00xx` form.
 */
function sanitize(text) {
    if (typeof text !== 'string') {
        return '';
    }
    return text.replaceAll(
    // eslint-disable-next-line no-control-regex
    /[\u0000-\u0009\u000b-\u001a]/gu, 
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    c => `\\u${c.codePointAt(0).toString(16).padStart(4, '0')}`);
}
// this symbol is used internally by ESLint to unwrap the wrapped parser
// https://github.com/eslint/eslint/blob/129e252132c7c476d7de17f40b54a333ddb2e6bb/lib/linter/linter.js#L139-L146
const parserSymbol = Symbol.for('eslint.RuleTester.parser');
/**
 * Wraps the given parser in order to intercept and modify return values from the `parse` and `parseForESLint` methods, for test purposes.
 * In particular, to modify ast nodes, tokens and comments to throw on access to their `start` and `end` properties.
 */
function wrapParser(parser) {
    /**
     * Define `start`/`end` properties of all nodes of the given AST as throwing error.
     */
    function defineStartEndAsErrorInTree(ast, visitorKeys) {
        /**
         * Define `start`/`end` properties as throwing error.
         */
        function defineStartEndAsError(objName, node) {
            Object.defineProperties(node, {
                end: {
                    configurable: true,
                    enumerable: false,
                    get() {
                        throw new Error(`Use ${objName}.range[1] instead of ${objName}.end`);
                    },
                },
                start: {
                    configurable: true,
                    enumerable: false,
                    get() {
                        throw new Error(`Use ${objName}.range[0] instead of ${objName}.start`);
                    },
                },
            });
        }
        (0, typescript_estree_1.simpleTraverse)(ast, {
            enter: node => defineStartEndAsError('node', node),
            visitorKeys,
        });
        ast.tokens?.forEach(token => defineStartEndAsError('token', token));
        ast.comments?.forEach(comment => defineStartEndAsError('token', comment));
    }
    if ('parseForESLint' in parser) {
        return {
            parseForESLint(...args) {
                const parsed = parser.parseForESLint(...args);
                defineStartEndAsErrorInTree(parsed.ast, parsed.visitorKeys);
                return parsed;
            },
            // @ts-expect-error -- see above
            [parserSymbol]: parser,
        };
    }
    return {
        parse(...args) {
            const ast = parser.parse(...args);
            defineStartEndAsErrorInTree(ast);
            return ast;
        },
        // @ts-expect-error -- see above
        [parserSymbol]: parser,
    };
}
exports.REQUIRED_SCENARIOS = ['valid', 'invalid'];
