"use strict";
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
// Forked from https://github.com/eslint/eslint/blob/ad9dd6a933fd098a0d99c6a9aa059850535c23ee/lib/rule-tester/rule-tester.js
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
exports.RuleTester = void 0;
const parser = __importStar(require("@typescript-eslint/parser"));
const eslint_utils_1 = require("@typescript-eslint/utils/eslint-utils");
const ts_eslint_1 = require("@typescript-eslint/utils/ts-eslint");
const node_assert_1 = __importDefault(require("node:assert"));
const node_path_1 = __importDefault(require("node:path"));
const node_util_1 = __importDefault(require("node:util"));
// we intentionally import from eslint here because we need to use the same class
// that ESLint uses, not our custom override typed version
const eslint_1 = require("eslint");
const json_stable_stringify_without_jsonify_1 = __importDefault(require("json-stable-stringify-without-jsonify"));
const lodash_merge_1 = __importDefault(require("lodash.merge"));
const TestFramework_1 = require("./TestFramework");
const ajv_1 = require("./utils/ajv");
const cloneDeeplyExcludesParent_1 = require("./utils/cloneDeeplyExcludesParent");
const config_validator_1 = require("./utils/config-validator");
const dependencyConstraints_1 = require("./utils/dependencyConstraints");
const freezeDeeply_1 = require("./utils/freezeDeeply");
const getRuleOptionsSchema_1 = require("./utils/getRuleOptionsSchema");
const hasOwnProperty_1 = require("./utils/hasOwnProperty");
const interpolate_1 = require("./utils/interpolate");
const omitCustomConfigProperties_1 = require("./utils/omitCustomConfigProperties");
const serialization_1 = require("./utils/serialization");
const SourceCodeFixer = __importStar(require("./utils/SourceCodeFixer"));
const validationHelpers_1 = require("./utils/validationHelpers");
const ajv = (0, ajv_1.ajvBuilder)({ strictDefaults: true });
const RULE_TESTER_PLUGIN = '@rule-tester';
const RULE_TESTER_PLUGIN_PREFIX = `${RULE_TESTER_PLUGIN}/`;
const TYPESCRIPT_ESLINT_PARSER = '@typescript-eslint/parser';
const DUPLICATE_PARSER_ERROR_MESSAGE = `Do not set the parser at the test level unless you want to use a parser other than "${TYPESCRIPT_ESLINT_PARSER}"`;
// instead of creating a hard dependency, just use a soft require
// a bit weird, but if they're using this tooling, it'll be installed
// eslint-disable-next-line @typescript-eslint/no-require-imports
const defaultParser = require(TYPESCRIPT_ESLINT_PARSER);
/*
 * testerDefaultConfig must not be modified as it allows to reset the tester to
 * the initial default configuration
 */
const testerDefaultConfig = {
    defaultFilenames: { ts: 'file.ts', tsx: 'react.tsx' },
    languageOptions: {
        parser: defaultParser,
    },
    rules: {},
};
let defaultConfig = (0, eslint_utils_1.deepMerge)({}, testerDefaultConfig);
const forbiddenMethods = [
    'applyInlineConfig',
    'applyLanguageOptions',
    'finalize',
];
const forbiddenMethodCalls = new Map(forbiddenMethods.map(methodName => [methodName, new WeakSet()]));
/**
 * Function to replace forbidden `SourceCode` methods. Allows just one call per method.
 * @param methodName The name of the method to forbid.
 * @param prototype The prototype with the original method to call.
 * @returns The function that throws the error.
 */
function throwForbiddenMethodError(methodName, prototype) {
    const original = prototype[methodName];
    return function (...args) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const called = forbiddenMethodCalls.get(methodName);
        if (!called.has(this)) {
            called.add(this);
            return original.apply(this, args);
        }
        throw new Error(`\`SourceCode#${methodName}()\` cannot be called inside a rule.`);
    };
}
/**
 * Extracts names of {{ placeholders }} from the reported message.
 * @param message Reported message
 * @returns Array of placeholder names
 */
function getMessagePlaceholders(message) {
    const matcher = (0, interpolate_1.getPlaceholderMatcher)();
    return Array.from(message.matchAll(matcher), ([, name]) => name.trim());
}
/**
 * Returns the placeholders in the reported messages but
 * only includes the placeholders available in the raw message and not in the provided data.
 * @param message The reported message
 * @param raw The raw message specified in the rule meta.messages
 * @param data The passed
 * @returns Missing placeholder names
 */
function getUnsubstitutedMessagePlaceholders(message, raw, data = {}) {
    const unsubstituted = getMessagePlaceholders(message);
    if (unsubstituted.length === 0) {
        return [];
    }
    // Remove false positives by only counting placeholders in the raw message, which were not provided in the data matcher or added with a data property
    const known = getMessagePlaceholders(raw);
    const provided = Object.keys(data);
    return unsubstituted.filter(name => known.includes(name) && !provided.includes(name));
}
class RuleTester extends TestFramework_1.TestFramework {
    #lintersByBasePath;
    #rules = {};
    #testerConfig;
    /**
     * Creates a new instance of RuleTester.
     */
    constructor(testerConfig) {
        super();
        /**
         * The configuration to use for this tester. Combination of the tester
         * configuration and the default configuration.
         */
        this.#testerConfig = (0, lodash_merge_1.default)({}, defaultConfig, testerConfig, {
            rules: { [`${RULE_TESTER_PLUGIN_PREFIX}validate-ast`]: 'error' },
        });
        this.#lintersByBasePath = new Map();
        // make sure that the parser doesn't hold onto file handles between tests
        // on linux (i.e. our CI env), there can be very a limited number of watch handles available
        const constructor = this.constructor;
        constructor.afterAll(() => {
            try {
                defaultParser.clearCaches();
            }
            catch {
                // ignored on purpose
            }
        });
    }
    #getLinterForFilename(filename) {
        let basePath = this.#testerConfig.languageOptions.parserOptions?.tsconfigRootDir;
        // For an absolute path (`/foo.ts`), or a path that steps
        // up (`../foo.ts`), resolve the path relative to the base
        // path (using the current working directory if the parser
        // options did not specify a base path) and use the file's
        // root as the base path so that the file is under the base
        // path. For any other path, which would just be a plain
        // file name (`foo.ts`), don't change the base path.
        if (filename != null &&
            (node_path_1.default.isAbsolute(filename) || filename.startsWith('..'))) {
            basePath = node_path_1.default.parse(node_path_1.default.resolve(basePath ?? process.cwd(), filename)).root;
        }
        let linterForBasePath = this.#lintersByBasePath.get(basePath);
        if (!linterForBasePath) {
            linterForBasePath = (() => {
                const linter = new ts_eslint_1.Linter({
                    configType: 'flat',
                    cwd: basePath,
                });
                // This nonsense is a workaround for https://github.com/jestjs/jest/issues/14840
                // see also https://github.com/typescript-eslint/typescript-eslint/issues/8942
                //
                // For some reason rethrowing exceptions skirts around the circular JSON error.
                const oldVerify = linter.verify.bind(linter);
                linter.verify = (...args) => {
                    try {
                        return oldVerify(...args);
                    }
                    catch (error) {
                        throw new Error('Caught an error while linting', {
                            cause: error,
                        });
                    }
                };
                return linter;
            })();
            this.#lintersByBasePath.set(basePath, linterForBasePath);
        }
        return linterForBasePath;
    }
    /**
     * Set the configuration to use for all future tests
     */
    static setDefaultConfig(config) {
        if (typeof config !== 'object' || config == null) {
            throw new TypeError('RuleTester.setDefaultConfig: config must be an object');
        }
        // Make sure the rules object exists since it is assumed to exist later
        defaultConfig = (0, eslint_utils_1.deepMerge)(defaultConfig, 
        // @ts-expect-error -- no index signature
        config);
    }
    /**
     * Get the current configuration used for all tests
     */
    static getDefaultConfig() {
        return defaultConfig;
    }
    /**
     * Reset the configuration to the initial configuration of the tester removing
     * any changes made until now.
     */
    static resetDefaultConfig() {
        defaultConfig = (0, lodash_merge_1.default)({}, testerDefaultConfig);
    }
    static only(item) {
        if (typeof item === 'string') {
            return { code: item, only: true };
        }
        return { ...item, only: true };
    }
    /**
     * Define a rule for one particular run of tests.
     */
    #normalizeTests(rawTests) {
        /*
        Automatically add a filename to the tests to enable type-aware tests to "just work".
        This saves users having to verbosely and manually add the filename to every
        single test case.
        Hugely helps with the string-based valid test cases as it means they don't
        need to be made objects!
        */
        const getFilename = (originalFilename, testOptions) => {
            const resolvedOptions = (0, eslint_utils_1.deepMerge)(this.#testerConfig.languageOptions.parserOptions, testOptions);
            const filename = originalFilename ??
                (resolvedOptions.ecmaFeatures?.jsx
                    ? this.#testerConfig.defaultFilenames.tsx
                    : this.#testerConfig.defaultFilenames.ts);
            if (resolvedOptions.project) {
                return node_path_1.default.join(resolvedOptions.tsconfigRootDir ?? process.cwd(), filename);
            }
            return filename;
        };
        const normalizeTest = (test) => {
            const { languageOptions = {} } = test;
            if (languageOptions.parser === parser) {
                throw new Error(DUPLICATE_PARSER_ERROR_MESSAGE);
            }
            return {
                ...test,
                filename: getFilename(test.filename, languageOptions.parserOptions),
                languageOptions: {
                    ...languageOptions,
                    parserOptions: {
                        // Re-running simulates --fix mode, which implies an isolated program
                        // (i.e. parseAndGenerateServicesCalls[test.filename] > 1).
                        disallowAutomaticSingleRunInference: true,
                        ...languageOptions.parserOptions,
                    },
                },
            };
        };
        const normalizedTests = {
            invalid: rawTests.invalid.map(normalizeTest),
            valid: rawTests.valid
                .map(test => {
                if (typeof test === 'string') {
                    return { code: test };
                }
                return test;
            })
                .map(normalizeTest),
        };
        // convenience iterator to make it easy to loop all tests without a concat
        const allTestsIterator = {
            *[Symbol.iterator]() {
                for (const testCase of normalizedTests.valid) {
                    yield testCase;
                }
                for (const testCase of normalizedTests.invalid) {
                    yield testCase;
                }
            },
        };
        const hasOnly = (() => {
            for (const test of allTestsIterator) {
                if (test.only) {
                    return true;
                }
            }
            return false;
        })();
        if (hasOnly) {
            // if there is an `only: true` - don't try apply constraints - assume that
            // we are in "local development" mode rather than "CI validation" mode
            return normalizedTests;
        }
        const hasConstraints = (() => {
            for (const test of allTestsIterator) {
                if (test.dependencyConstraints &&
                    Object.keys(test.dependencyConstraints).length > 0) {
                    return true;
                }
            }
            return false;
        })();
        if (!hasConstraints) {
            return normalizedTests;
        }
        /*
        Mark all unsatisfactory tests as `skip: true`.
        We do this instead of just omitting the tests entirely because it gives the
        test framework the opportunity to log the test as skipped rather than the test
        just disappearing without a trace.
        */
        const maybeMarkAsOnly = (test) => {
            return {
                ...test,
                skip: !(0, dependencyConstraints_1.satisfiesAllDependencyConstraints)(test.dependencyConstraints),
            };
        };
        normalizedTests.valid = normalizedTests.valid.map(maybeMarkAsOnly);
        normalizedTests.invalid = normalizedTests.invalid.map(maybeMarkAsOnly);
        return normalizedTests;
    }
    defineRule(name, rule) {
        this.#rules[name] = {
            ...rule,
            // Create a wrapper rule that freezes the `context` properties.
            create(context) {
                (0, freezeDeeply_1.freezeDeeply)(context.options);
                (0, freezeDeeply_1.freezeDeeply)(context.settings);
                (0, freezeDeeply_1.freezeDeeply)(context.parserOptions);
                return (typeof rule === 'function' ? rule : rule.create)(context);
            },
        };
    }
    /**
     * Runs a hook on the given item when it's assigned to the given property
     * @throws {Error} If the property is not a function or that function throws an error
     */
    #runHook(item, prop) {
        if ((0, hasOwnProperty_1.hasOwnProperty)(item, prop)) {
            node_assert_1.default.strictEqual(typeof item[prop], 'function', `Optional test case property '${prop}' must be a function`);
            item[prop]();
        }
    }
    /**
     * Adds a new rule test to execute.
     */
    run(ruleName, rule, test) {
        const constructor = this.constructor;
        if (this.#testerConfig.dependencyConstraints &&
            !(0, dependencyConstraints_1.satisfiesAllDependencyConstraints)(this.#testerConfig.dependencyConstraints)) {
            // for frameworks like mocha or jest that have a "skip" version of their function
            // we can provide a nice skipped test!
            constructor.describeSkip(ruleName, () => {
                constructor.it('All tests skipped due to unsatisfied constructor dependency constraints', () => {
                    // some frameworks error if there are no assertions
                    node_assert_1.default.equal(true, true);
                });
            });
            // don't run any tests because we don't match the base constraint
            return;
        }
        if (!test || typeof test !== 'object') {
            throw new TypeError(`Test Scenarios for rule ${ruleName} : Could not find test scenario object`);
        }
        const scenarioErrors = [];
        validationHelpers_1.REQUIRED_SCENARIOS.forEach(scenarioType => {
            if (!test[scenarioType]) {
                scenarioErrors.push(`Could not find any ${scenarioType} test scenarios`);
            }
        });
        if (scenarioErrors.length > 0) {
            throw new Error([
                `Test Scenarios for rule ${ruleName} is invalid:`,
                ...scenarioErrors,
            ].join('\n'));
        }
        const seenValidTestCases = new Set();
        const seenInvalidTestCases = new Set();
        const normalizedTests = this.#normalizeTests(test);
        function getTestMethod(test) {
            if (test.skip) {
                return 'itSkip';
            }
            if (test.only) {
                return 'itOnly';
            }
            return 'it';
        }
        /*
         * This creates a test suite and pipes all supplied info through
         * one of the templates above.
         */
        constructor.describe(ruleName, () => {
            if (normalizedTests.valid.length) {
                constructor.describe('valid', () => {
                    normalizedTests.valid.forEach(valid => {
                        const testName = (() => {
                            if (valid.name == null || valid.name.length === 0) {
                                return valid.code;
                            }
                            return valid.name;
                        })();
                        constructor[getTestMethod(valid)]((0, validationHelpers_1.sanitize)(testName), () => {
                            try {
                                this.#runHook(valid, 'before');
                                this.#testValidTemplate(ruleName, rule, valid, seenValidTestCases);
                            }
                            finally {
                                this.#runHook(valid, 'after');
                            }
                        });
                    });
                });
            }
            if (normalizedTests.invalid.length) {
                constructor.describe('invalid', () => {
                    normalizedTests.invalid.forEach(invalid => {
                        const name = (() => {
                            if (invalid.name == null || invalid.name.length === 0) {
                                return invalid.code;
                            }
                            return invalid.name;
                        })();
                        constructor[getTestMethod(invalid)]((0, validationHelpers_1.sanitize)(name), () => {
                            try {
                                this.#runHook(invalid, 'before');
                                this.#testInvalidTemplate(ruleName, rule, 
                                // no need to pass no infer type parameter down to private methods
                                invalid, seenInvalidTestCases);
                            }
                            finally {
                                this.#runHook(invalid, 'after');
                            }
                        });
                    });
                });
            }
        });
    }
    /**
     * Run the rule for the given item
     * @throws {Error} If an invalid schema.
     * Use @private instead of #private to expose it for testing purposes
     */
    runRuleForItem(ruleName, rule, item) {
        this.defineRule(ruleName, rule);
        let config = (0, lodash_merge_1.default)({}, this.#testerConfig, {
            files: ['**'],
            plugins: {
                [RULE_TESTER_PLUGIN]: {
                    rules: {
                        /**
                         * Setup AST getters.
                         * The goal is to check whether or not AST was modified when
                         * running the rule under test.
                         */
                        'validate-ast': {
                            create() {
                                return {
                                    Program(node) {
                                        beforeAST = (0, cloneDeeplyExcludesParent_1.cloneDeeplyExcludesParent)(node);
                                    },
                                    'Program:exit'(node) {
                                        afterAST = node;
                                    },
                                };
                            },
                        },
                        ...this.#rules,
                    },
                },
            },
        });
        // Unlike other properties, we don't want to spread props between different parsers.
        config.languageOptions.parser =
            item.languageOptions?.parser ?? this.#testerConfig.languageOptions.parser;
        let code;
        let filename;
        let beforeAST;
        let afterAST;
        if (typeof item === 'string') {
            code = item;
        }
        else {
            code = item.code;
            /*
             * Assumes everything on the item is a config except for the
             * parameters used by this tester
             */
            const itemConfig = { ...item };
            for (const parameter of validationHelpers_1.RULE_TESTER_PARAMETERS) {
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete itemConfig[parameter];
            }
            /*
             * Create the config object from the tester config and this item
             * specific configurations.
             */
            config = (0, lodash_merge_1.default)(config, itemConfig);
        }
        if ((0, hasOwnProperty_1.hasOwnProperty)(item, 'only')) {
            node_assert_1.default.ok(typeof item.only === 'boolean', "Optional test case property 'only' must be a boolean");
        }
        if ((0, hasOwnProperty_1.hasOwnProperty)(item, 'filename')) {
            node_assert_1.default.ok(typeof item.filename === 'string', "Optional test case property 'filename' must be a string");
            filename = item.filename;
        }
        const prefixedRuleName = `${RULE_TESTER_PLUGIN_PREFIX}${ruleName}`;
        if ((0, hasOwnProperty_1.hasOwnProperty)(item, 'options')) {
            (0, node_assert_1.default)(Array.isArray(item.options), 'options must be an array');
            config.rules[prefixedRuleName] = ['error', ...item.options];
        }
        else {
            config.rules[prefixedRuleName] = 'error';
        }
        config.languageOptions ??= {};
        config.languageOptions.parser ??= defaultParser;
        config.languageOptions.parser = (0, validationHelpers_1.wrapParser)(config.languageOptions.parser);
        const schema = (0, getRuleOptionsSchema_1.getRuleOptionsSchema)(rule);
        if (schema) {
            ajv.validateSchema(schema);
            if (ajv.errors) {
                const errors = ajv.errors
                    .map(error => {
                    const field = error.dataPath[0] === '.'
                        ? error.dataPath.slice(1)
                        : error.dataPath;
                    return `\t${field}: ${error.message}`;
                })
                    .join('\n');
                throw new Error([`Schema for rule ${ruleName} is invalid:`, errors].join(
                // no space after comma to match eslint core
                ','));
            }
            /*
             * `ajv.validateSchema` checks for errors in the structure of the schema (by comparing the schema against a "meta-schema"),
             * and it reports those errors individually. However, there are other types of schema errors that only occur when compiling
             * the schema (e.g. using invalid defaults in a schema), and only one of these errors can be reported at a time. As a result,
             * the schema is compiled here separately from checking for `validateSchema` errors.
             */
            try {
                ajv.compile(schema);
            }
            catch (err) {
                throw new Error(`Schema for rule ${ruleName} is invalid: ${err.message}`);
            }
        }
        (0, config_validator_1.validate)(config, RULE_TESTER_PLUGIN, id => (id === ruleName ? rule : null));
        // Verify the code.
        let initialMessages = null;
        let messages = null;
        let fixedResult = null;
        let passNumber = 0;
        const outputs = [];
        const configWithoutCustomKeys = (0, omitCustomConfigProperties_1.omitCustomConfigProperties)(config);
        const linter = this.#getLinterForFilename(filename);
        do {
            passNumber++;
            const SourceCodePrototype = eslint_1.SourceCode.prototype;
            const { applyInlineConfig, applyLanguageOptions, finalize } = SourceCodePrototype;
            try {
                forbiddenMethods.forEach(methodName => {
                    SourceCodePrototype[methodName] = throwForbiddenMethodError(methodName, SourceCodePrototype);
                });
                const actualConfig = (0, lodash_merge_1.default)(configWithoutCustomKeys, {
                    languageOptions: {
                        ...configWithoutCustomKeys.languageOptions,
                        parserOptions: {
                            ecmaVersion: 'latest',
                            sourceType: 'module',
                            ...configWithoutCustomKeys.languageOptions?.parserOptions,
                        },
                    },
                    linterOptions: {
                        reportUnusedDisableDirectives: 1,
                        ...configWithoutCustomKeys.linterOptions,
                    },
                });
                messages = linter.verify(code, actualConfig, filename);
            }
            finally {
                SourceCodePrototype.applyInlineConfig = applyInlineConfig;
                SourceCodePrototype.applyLanguageOptions = applyLanguageOptions;
                SourceCodePrototype.finalize = finalize;
            }
            initialMessages ??= messages;
            if (messages.length === 0) {
                break;
            }
            const fatalErrorMessage = messages.find(m => m.fatal);
            (0, node_assert_1.default)(!fatalErrorMessage, `A fatal parsing error occurred: ${fatalErrorMessage?.message}`);
            fixedResult = SourceCodeFixer.applyFixes(code, messages);
            if (fixedResult.output === code) {
                break;
            }
            code = fixedResult.output;
            outputs.push(code);
            // Verify if autofix makes a syntax error or not.
            const errorMessageInFix = linter
                .verify(fixedResult.output, configWithoutCustomKeys, filename)
                .find(m => m.fatal);
            (0, node_assert_1.default)(!errorMessageInFix, [
                'A fatal parsing error occurred in autofix.',
                `Error: ${errorMessageInFix?.message}`,
                'Autofix output:',
                fixedResult.output,
            ].join('\n'));
        } while (fixedResult.fixed && passNumber < 10);
        return {
            config,
            filename,
            messages: initialMessages,
            outputs,
            // is definitely assigned within the `@rule-tester/validate-ast` rule
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            beforeAST: beforeAST,
            // is definitely assigned within the `@rule-tester/validate-ast` rule
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            afterAST: (0, cloneDeeplyExcludesParent_1.cloneDeeplyExcludesParent)(afterAST),
        };
    }
    /**
     * Check if the template is valid or not
     * all valid cases go through this
     */
    #testValidTemplate(ruleName, rule, itemIn, seenValidTestCases) {
        const item = typeof itemIn === 'object' ? itemIn : { code: itemIn };
        node_assert_1.default.ok(typeof item.code === 'string', "Test case must specify a string value for 'code'");
        if (item.name) {
            node_assert_1.default.ok(typeof item.name === 'string', "Optional test case property 'name' must be a string");
        }
        checkDuplicateTestCase(item, seenValidTestCases);
        const result = this.runRuleForItem(ruleName, rule, item);
        const messages = result.messages;
        node_assert_1.default.strictEqual(messages.length, 0, node_util_1.default.format('Should have no errors but had %d: %s', messages.length, node_util_1.default.inspect(messages)));
        assertASTDidntChange(result.beforeAST, result.afterAST);
    }
    /**
     * Check if the template is invalid or not
     * all invalid cases go through this.
     */
    #testInvalidTemplate(ruleName, rule, item, seenInvalidTestCases) {
        node_assert_1.default.ok(typeof item.code === 'string', "Test case must specify a string value for 'code'");
        if (item.name) {
            node_assert_1.default.ok(typeof item.name === 'string', "Optional test case property 'name' must be a string");
        }
        node_assert_1.default.ok(item.errors || item.errors === 0, `Did not specify errors for an invalid test of ${ruleName}`);
        if (Array.isArray(item.errors) && item.errors.length === 0) {
            node_assert_1.default.fail('Invalid cases must have at least one error');
        }
        checkDuplicateTestCase(item, seenInvalidTestCases);
        const ruleHasMetaMessages = (0, hasOwnProperty_1.hasOwnProperty)(rule, 'meta') && (0, hasOwnProperty_1.hasOwnProperty)(rule.meta, 'messages');
        const friendlyIDList = ruleHasMetaMessages
            ? `[${Object.keys(rule.meta.messages)
                .map(key => `'${key}'`)
                .join(', ')}]`
            : null;
        const result = this.runRuleForItem(ruleName, rule, item);
        const messages = result.messages.map(message => ({
            ...message,
            ...(message.ruleId && {
                ruleId: message.ruleId.startsWith(RULE_TESTER_PLUGIN_PREFIX)
                    ? message.ruleId.slice(RULE_TESTER_PLUGIN_PREFIX.length)
                    : message.ruleId,
            }),
        }));
        for (const message of messages) {
            if ((0, hasOwnProperty_1.hasOwnProperty)(message, 'suggestions')) {
                const seenMessageIndices = new Map();
                for (let i = 0; i < message.suggestions.length; i += 1) {
                    const suggestionMessage = message.suggestions[i].desc;
                    const previous = seenMessageIndices.get(suggestionMessage);
                    node_assert_1.default.ok(!seenMessageIndices.has(suggestionMessage), `Suggestion message '${suggestionMessage}' reported from suggestion ${i} was previously reported by suggestion ${previous}. Suggestion messages should be unique within an error.`);
                    seenMessageIndices.set(suggestionMessage, i);
                }
            }
        }
        if (typeof item.errors === 'number') {
            if (item.errors === 0) {
                node_assert_1.default.fail("Invalid cases must have 'error' value greater than 0");
            }
            node_assert_1.default.strictEqual(messages.length, item.errors, node_util_1.default.format('Should have %d error%s but had %d: %s', item.errors, item.errors === 1 ? '' : 's', messages.length, node_util_1.default.inspect(messages)));
        }
        else {
            node_assert_1.default.strictEqual(messages.length, item.errors.length, node_util_1.default.format('Should have %d error%s but had %d: %s', item.errors.length, item.errors.length === 1 ? '' : 's', messages.length, node_util_1.default.inspect(messages)));
            const hasMessageOfThisRule = messages.some(m => m.ruleId === ruleName);
            // console.log({ messages });
            for (let i = 0, l = item.errors.length; i < l; i++) {
                const error = item.errors[i];
                const message = messages[i];
                (0, node_assert_1.default)(hasMessageOfThisRule, 'Error rule name should be the same as the name of the rule being tested');
                if (typeof error === 'string' || error instanceof RegExp) {
                    // Just an error message.
                    assertMessageMatches(message.message, error);
                    node_assert_1.default.ok(message.suggestions == null, `Error at index ${i} has suggestions. Please convert the test error into an object and specify 'suggestions' property on it to test suggestions.`);
                }
                else if (typeof error === 'object' && error != null) {
                    /*
                     * Error object.
                     * This may have a message, messageId, data, node type, line, and/or
                     * column.
                     */
                    Object.keys(error).forEach(propertyName => {
                        node_assert_1.default.ok(validationHelpers_1.ERROR_OBJECT_PARAMETERS.has(propertyName), `Invalid error property name '${propertyName}'. Expected one of ${validationHelpers_1.FRIENDLY_ERROR_OBJECT_PARAMETER_LIST}.`);
                    });
                    // @ts-expect-error -- we purposely don't define `message` on our types as the current standard is `messageId`
                    if ((0, hasOwnProperty_1.hasOwnProperty)(error, 'message')) {
                        node_assert_1.default.ok(!(0, hasOwnProperty_1.hasOwnProperty)(error, 'messageId'), "Error should not specify both 'message' and a 'messageId'.");
                        node_assert_1.default.ok(!(0, hasOwnProperty_1.hasOwnProperty)(error, 'data'), "Error should not specify both 'data' and 'message'.");
                        assertMessageMatches(message.message, 
                        // @ts-expect-error -- we purposely don't define `message` on our types as the current standard is `messageId`
                        error.message);
                    }
                    else if ((0, hasOwnProperty_1.hasOwnProperty)(error, 'messageId')) {
                        node_assert_1.default.ok(ruleHasMetaMessages, "Error can not use 'messageId' if rule under test doesn't define 'meta.messages'.");
                        if (!(0, hasOwnProperty_1.hasOwnProperty)(rule.meta.messages, error.messageId)) {
                            (0, node_assert_1.default)(false, `Invalid messageId '${error.messageId}'. Expected one of ${friendlyIDList}.`);
                        }
                        node_assert_1.default.strictEqual(message.messageId, error.messageId, `messageId '${message.messageId}' does not match expected messageId '${error.messageId}'.`);
                        const unsubstitutedPlaceholders = getUnsubstitutedMessagePlaceholders(message.message, rule.meta.messages[message.messageId], error.data);
                        node_assert_1.default.ok(unsubstitutedPlaceholders.length === 0, `The reported message has ${unsubstitutedPlaceholders.length > 1 ? `unsubstituted placeholders: ${unsubstitutedPlaceholders.map(name => `'${name}'`).join(', ')}` : `an unsubstituted placeholder '${unsubstitutedPlaceholders[0]}'`}. Please provide the missing ${unsubstitutedPlaceholders.length > 1 ? 'values' : 'value'} via the 'data' property in the context.report() call.`);
                        if ((0, hasOwnProperty_1.hasOwnProperty)(error, 'data')) {
                            /*
                             *  if data was provided, then directly compare the returned message to a synthetic
                             *  interpolated message using the same message ID and data provided in the test.
                             *  See https://github.com/eslint/eslint/issues/9890 for context.
                             */
                            const unformattedOriginalMessage = rule.meta.messages[error.messageId];
                            const rehydratedMessage = (0, interpolate_1.interpolate)(unformattedOriginalMessage, error.data);
                            node_assert_1.default.strictEqual(message.message, rehydratedMessage, `Hydrated message "${rehydratedMessage}" does not match "${message.message}"`);
                        }
                    }
                    else {
                        node_assert_1.default.fail("Test error must specify either a 'messageId' or 'message'.");
                    }
                    if (error.type) {
                        node_assert_1.default.strictEqual(message.nodeType, error.type, `Error type should be ${error.type}, found ${message.nodeType}`);
                    }
                    if ((0, hasOwnProperty_1.hasOwnProperty)(error, 'line')) {
                        node_assert_1.default.strictEqual(message.line, error.line, `Error line should be ${error.line}`);
                    }
                    if ((0, hasOwnProperty_1.hasOwnProperty)(error, 'column')) {
                        node_assert_1.default.strictEqual(message.column, error.column, `Error column should be ${error.column}`);
                    }
                    if ((0, hasOwnProperty_1.hasOwnProperty)(error, 'endLine')) {
                        node_assert_1.default.strictEqual(message.endLine, error.endLine, `Error endLine should be ${error.endLine}`);
                    }
                    if ((0, hasOwnProperty_1.hasOwnProperty)(error, 'endColumn')) {
                        node_assert_1.default.strictEqual(message.endColumn, error.endColumn, `Error endColumn should be ${error.endColumn}`);
                    }
                    node_assert_1.default.ok(!message.suggestions || (0, hasOwnProperty_1.hasOwnProperty)(error, 'suggestions'), `Error at index ${i} has suggestions. Please specify 'suggestions' property on the test error object.`);
                    if ((0, hasOwnProperty_1.hasOwnProperty)(error, 'suggestions')) {
                        // Support asserting there are no suggestions
                        const expectsSuggestions = Array.isArray(error.suggestions)
                            ? error.suggestions.length > 0
                            : Boolean(error.suggestions);
                        const hasSuggestions = message.suggestions != null;
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        const messageSuggestions = message.suggestions;
                        if (!hasSuggestions && expectsSuggestions) {
                            node_assert_1.default.ok(!error.suggestions, `Error should have suggestions on error with message: "${message.message}"`);
                        }
                        else if (hasSuggestions) {
                            node_assert_1.default.ok(expectsSuggestions, `Error should have no suggestions on error with message: "${message.message}"`);
                            if (typeof error.suggestions === 'number') {
                                node_assert_1.default.strictEqual(messageSuggestions.length, error.suggestions, 
                                // It is possible that error.suggestions is a number
                                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                                `Error should have ${error.suggestions} suggestions. Instead found ${messageSuggestions.length} suggestions`);
                            }
                            else if (Array.isArray(error.suggestions)) {
                                node_assert_1.default.strictEqual(messageSuggestions.length, error.suggestions.length, `Error should have ${error.suggestions.length} suggestions. Instead found ${messageSuggestions.length} suggestions`);
                                error.suggestions.forEach((expectedSuggestion, index) => {
                                    node_assert_1.default.ok(typeof expectedSuggestion === 'object' &&
                                        expectedSuggestion != null, "Test suggestion in 'suggestions' array must be an object.");
                                    Object.keys(expectedSuggestion).forEach(propertyName => {
                                        node_assert_1.default.ok(validationHelpers_1.SUGGESTION_OBJECT_PARAMETERS.has(propertyName), `Invalid suggestion property name '${propertyName}'. Expected one of ${validationHelpers_1.FRIENDLY_SUGGESTION_OBJECT_PARAMETER_LIST}.`);
                                    });
                                    const actualSuggestion = messageSuggestions[index];
                                    const suggestionPrefix = `Error Suggestion at index ${index}:`;
                                    // @ts-expect-error -- we purposely don't define `desc` on our types as the current standard is `messageId`
                                    if ((0, hasOwnProperty_1.hasOwnProperty)(expectedSuggestion, 'desc')) {
                                        // @ts-expect-error -- we purposely don't define `desc` on our types as the current standard is `messageId`
                                        const expectedDesc = expectedSuggestion.desc;
                                        node_assert_1.default.ok(!(0, hasOwnProperty_1.hasOwnProperty)(expectedSuggestion, 'data'), `${suggestionPrefix} Test should not specify both 'desc' and 'data'.`);
                                        node_assert_1.default.ok(!(0, hasOwnProperty_1.hasOwnProperty)(expectedSuggestion, 'messageId'), `${suggestionPrefix} Test should not specify both 'desc' and 'messageId'.`);
                                        node_assert_1.default.strictEqual(actualSuggestion.desc, expectedDesc, `${suggestionPrefix} desc should be "${expectedDesc}" but got "${actualSuggestion.desc}" instead.`);
                                    }
                                    else if ((0, hasOwnProperty_1.hasOwnProperty)(expectedSuggestion, 'messageId')) {
                                        node_assert_1.default.ok(ruleHasMetaMessages, `${suggestionPrefix} Test can not use 'messageId' if rule under test doesn't define 'meta.messages'.`);
                                        node_assert_1.default.ok((0, hasOwnProperty_1.hasOwnProperty)(rule.meta.messages, expectedSuggestion.messageId), `${suggestionPrefix} Test has invalid messageId '${expectedSuggestion.messageId}', the rule under test allows only one of ${friendlyIDList}.`);
                                        node_assert_1.default.strictEqual(actualSuggestion.messageId, expectedSuggestion.messageId, `${suggestionPrefix} messageId should be '${expectedSuggestion.messageId}' but got '${actualSuggestion.messageId}' instead.`);
                                        const unsubstitutedPlaceholders = getUnsubstitutedMessagePlaceholders(actualSuggestion.desc, rule.meta.messages[expectedSuggestion.messageId], expectedSuggestion.data);
                                        node_assert_1.default.ok(unsubstitutedPlaceholders.length === 0, `The message of the suggestion has ${unsubstitutedPlaceholders.length > 1 ? `unsubstituted placeholders: ${unsubstitutedPlaceholders.map(name => `'${name}'`).join(', ')}` : `an unsubstituted placeholder '${unsubstitutedPlaceholders[0]}'`}. Please provide the missing ${unsubstitutedPlaceholders.length > 1 ? 'values' : 'value'} via the 'data' property for the suggestion in the context.report() call.`);
                                        if ((0, hasOwnProperty_1.hasOwnProperty)(expectedSuggestion, 'data')) {
                                            const unformattedMetaMessage = rule.meta.messages[expectedSuggestion.messageId];
                                            const rehydratedDesc = (0, interpolate_1.interpolate)(unformattedMetaMessage, expectedSuggestion.data);
                                            node_assert_1.default.strictEqual(actualSuggestion.desc, rehydratedDesc, `${suggestionPrefix} Hydrated test desc "${rehydratedDesc}" does not match received desc "${actualSuggestion.desc}".`);
                                        }
                                    }
                                    else if ((0, hasOwnProperty_1.hasOwnProperty)(expectedSuggestion, 'data')) {
                                        node_assert_1.default.fail(`${suggestionPrefix} Test must specify 'messageId' if 'data' is used.`);
                                    }
                                    else {
                                        node_assert_1.default.fail(`${suggestionPrefix} Test must specify either 'messageId' or 'desc'.`);
                                    }
                                    node_assert_1.default.ok((0, hasOwnProperty_1.hasOwnProperty)(expectedSuggestion, 'output'), `${suggestionPrefix} The "output" property is required.`);
                                    const codeWithAppliedSuggestion = SourceCodeFixer.applyFixes(item.code, [
                                        actualSuggestion,
                                    ]).output;
                                    // Verify if suggestion fix makes a syntax error or not.
                                    const errorMessageInSuggestion = this.#getLinterForFilename(item.filename)
                                        .verify(codeWithAppliedSuggestion, (0, omitCustomConfigProperties_1.omitCustomConfigProperties)(result.config), result.filename)
                                        .find(m => m.fatal);
                                    (0, node_assert_1.default)(!errorMessageInSuggestion, [
                                        'A fatal parsing error occurred in suggestion fix.',
                                        `Error: ${errorMessageInSuggestion?.message}`,
                                        'Suggestion output:',
                                        codeWithAppliedSuggestion,
                                    ].join('\n'));
                                    node_assert_1.default.strictEqual(codeWithAppliedSuggestion, expectedSuggestion.output, `Expected the applied suggestion fix to match the test suggestion output for suggestion at index: ${index} on error with message: "${message.message}"`);
                                    node_assert_1.default.notStrictEqual(expectedSuggestion.output, item.code, `The output of a suggestion should differ from the original source code for suggestion at index: ${index} on error with message: "${message.message}"`);
                                });
                            }
                            else {
                                node_assert_1.default.fail("Test error object property 'suggestions' should be an array or a number");
                            }
                        }
                    }
                }
                else {
                    // Message was an unexpected type
                    node_assert_1.default.fail(`Error should be a string, object, or RegExp, but found (${node_util_1.default.inspect(message)})`);
                }
            }
        }
        if ((0, hasOwnProperty_1.hasOwnProperty)(item, 'output')) {
            if (item.output == null) {
                if (result.outputs.length) {
                    node_assert_1.default.strictEqual(result.outputs[0], item.code, 'Expected no autofixes to be suggested.');
                }
            }
            else if (typeof item.output === 'string') {
                (0, node_assert_1.default)(result.outputs.length > 0, 'Expected autofix to be suggested.');
                node_assert_1.default.strictEqual(result.outputs[0], item.output, 'Output is incorrect.');
                if (result.outputs.length) {
                    node_assert_1.default.deepStrictEqual(result.outputs, [item.output], 'Multiple autofixes are required due to overlapping fix ranges - please use the array form of output to declare all of the expected autofix passes.');
                }
            }
            else {
                (0, node_assert_1.default)(result.outputs.length > 0, 'Expected autofix to be suggested.');
                node_assert_1.default.deepStrictEqual(result.outputs, item.output, 'Outputs do not match.');
            }
        }
        else if (result.outputs.length) {
            node_assert_1.default.strictEqual(result.outputs[0], item.code, "The rule fixed the code. Please add 'output' property.");
        }
        assertASTDidntChange(result.beforeAST, result.afterAST);
    }
}
exports.RuleTester = RuleTester;
/**
 * Check if the AST was changed
 */
function assertASTDidntChange(beforeAST, afterAST) {
    node_assert_1.default.deepStrictEqual(beforeAST, afterAST, 'Rule should not modify AST.');
}
/**
 * Check if this test case is a duplicate of one we have seen before.
 */
function checkDuplicateTestCase(item, seenTestCases) {
    if (!(0, serialization_1.isSerializable)(item)) {
        /*
         * If we can't serialize a test case (because it contains a function, RegExp, etc), skip the check.
         * This might happen with properties like: options, plugins, settings, languageOptions.parser, languageOptions.parserOptions.
         */
        return;
    }
    const serializedTestCase = (0, json_stable_stringify_without_jsonify_1.default)(item);
    (0, node_assert_1.default)(!seenTestCases.has(serializedTestCase), 'detected duplicate test case');
    seenTestCases.add(serializedTestCase);
}
/**
 * Asserts that the message matches its expected value. If the expected
 * value is a regular expression, it is checked against the actual
 * value.
 */
function assertMessageMatches(actual, expected) {
    if (expected instanceof RegExp) {
        // assert.js doesn't have a built-in RegExp match function
        node_assert_1.default.ok(expected.test(actual), `Expected '${actual}' to match ${expected}`);
    }
    else {
        node_assert_1.default.strictEqual(actual, expected);
    }
}
