import { Command, Argument, Option } from 'commander';
import { RULE_DOC_TITLE_FORMATS } from './rule-doc-title-format.js';
import { OPTION_DEFAULTS } from './options.js';
import { cosmiconfig } from 'cosmiconfig';
import Ajv from 'ajv';
import merge from 'deepmerge';
import { COLUMN_TYPE, NOTICE_TYPE, OPTION_TYPE, } from './types.js';
import { getCurrentPackageVersion } from './package-json.js';
import { boolean, isBooleanable } from './boolean.js';
import { CONFIG_FORMATS } from './config-format.js';
/**
 * Used for collecting repeated CLI options into an array.
 * Example: --foo bar --foo baz => ['bar', 'baz']
 */
function collect(value, previous) {
    return [...previous, value];
}
/**
 * Used for collecting CSV CLI options into an array.
 * Example: --foo bar,baz,buz => ['bar', 'baz', 'buz']
 * */
function collectCSV(value, previous) {
    return [...previous, ...value.split(',')];
}
/**
 * Used for collecting repeated, nested CSV CLI options into an array of arrays.
 * Example: --foo baz,bar --foo biz,buz => [['baz', 'bar'], ['biz', 'buz']]
 * */
function collectCSVNested(value, previous) {
    return [...previous, value.split(',')];
}
function parseBoolean(value) {
    return value === undefined || (isBooleanable(value) && boolean(value));
}
/**
 * Load and validate the config file.
 * Cosmiconfig supports many possible filenames/formats.
 */
async function loadConfigFileOptions() {
    const explorer = cosmiconfig('eslint-doc-generator');
    const explorerResults = await explorer.search();
    if (explorerResults && !explorerResults.isEmpty) {
        // Validate schema for config file.
        const schemaStringArray = {
            type: 'array',
            uniqueItems: true,
            minItems: 1,
            items: {
                type: 'string',
                minLength: 1,
            },
        };
        const schemaConfigEmoji = {
            // Top-level array.
            type: 'array',
            uniqueItems: true,
            minItems: 1,
            items: {
                // Nested array (config/emoji tuple).
                type: 'array',
                uniqueItems: true,
                minItems: 1, // Allowed to pass only config name to remove default emoji.
                maxItems: 2, // Normally, two items will be passed.
                items: {
                    type: 'string',
                    minLength: 1,
                },
            },
        };
        const properties = {
            check: { type: 'boolean' },
            configEmoji: schemaConfigEmoji,
            configFormat: { type: 'string' },
            ignoreConfig: schemaStringArray,
            ignoreDeprecatedRules: { type: 'boolean' },
            initRuleDocs: { type: 'boolean' },
            pathRuleDoc: 
            /* istanbul ignore next -- TODO: haven't tested JavaScript config files yet https://github.com/bmish/eslint-doc-generator/issues/366 */
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            typeof explorerResults.config.pathRuleDoc === 'function'
                ? {
                /* Functions are allowed but JSON Schema can't validate them so no-op in this case. */
                }
                : { type: 'string' },
            pathRuleList: { anyOf: [{ type: 'string' }, schemaStringArray] },
            postprocess: {
            /* JSON Schema can't validate functions so check this later */
            },
            ruleDocNotices: schemaStringArray,
            ruleDocSectionExclude: schemaStringArray,
            ruleDocSectionInclude: schemaStringArray,
            ruleDocSectionOptions: { type: 'boolean' },
            ruleDocTitleFormat: { type: 'string' },
            ruleListColumns: schemaStringArray,
            ruleListSplit: 
            /* istanbul ignore next -- TODO: haven't tested JavaScript config files yet https://github.com/bmish/eslint-doc-generator/issues/366 */
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            typeof explorerResults.config.ruleListSplit === 'function'
                ? {
                /* Functions are allowed but JSON Schema can't validate them so no-op in this case. */
                }
                : { anyOf: [{ type: 'string' }, schemaStringArray] },
            urlConfigs: { type: 'string' },
            urlRuleDoc: 
            /* istanbul ignore next -- TODO: haven't tested JavaScript config files yet https://github.com/bmish/eslint-doc-generator/issues/366 */
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            typeof explorerResults.config.urlRuleDoc === 'function'
                ? {
                /* Functions are allowed but JSON Schema can't validate them so no-op in this case. */
                }
                : { type: 'string' },
        };
        const schema = {
            type: 'object',
            properties,
            additionalProperties: false,
        };
        const ajv = new Ajv();
        const validate = ajv.compile(schema);
        const valid = validate(explorerResults.config);
        if (!valid) {
            throw new Error(validate.errors
                ? ajv.errorsText(validate.errors, { dataVar: 'config file' })
                : /* istanbul ignore next -- this shouldn't happen */
                    'Invalid config file');
        }
        const config = explorerResults.config; // eslint-disable-line @typescript-eslint/no-unsafe-assignment -- Rules are disabled because we haven't applied the GenerateOptions type until after we finish validating/normalizing.
        // Additional validation that couldn't be handled by ajv.
        /* eslint-disable @typescript-eslint/no-unsafe-member-access -- disabled for same reason above */
        if (config.postprocess && typeof config.postprocess !== 'function') {
            throw new Error('postprocess must be a function.');
        }
        // Perform any normalization.
        if (typeof config.pathRuleList === 'string') {
            config.pathRuleList = [config.pathRuleList];
        }
        if (typeof config.ruleListSplit === 'string') {
            config.ruleListSplit = [config.ruleListSplit];
        }
        return explorerResults.config;
    }
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */
    return {};
}
/**
 * Run the CLI and gather options.
 * When this is done, load any config file and merge with the CLI options.
 * Finally, invoke a callback with the merged options.
 * Note: Does not introduce default values. Default values should be handled in the callback function.
 */
export async function run(argv, cb) {
    const program = new Command();
    // Documentation for options should be kept in sync with README.md and the JSDocs for the `GenerateOptions` type.
    await program
        .version(await getCurrentPackageVersion())
        .addArgument(new Argument('[path]', 'path to ESLint plugin root').default('.'))
        .option('--check [boolean]', `(optional) Whether to check for and fail if there is a diff. Any diff will be displayed but no output will be written to files. Typically used during CI. (default: ${String(OPTION_DEFAULTS[OPTION_TYPE.CHECK])})`, parseBoolean)
        .option('--config-emoji <config-emoji>', '(optional) Custom emoji to use for a config. Format is `config-name,emoji`. Default emojis are provided for common configs. To use a text/image/icon badge instead of an emoji, supply the corresponding markdown as the emoji. Option can be repeated.', collectCSVNested, [])
        .addOption(new Option('--config-format <config-format>', `(optional) The format to use for the config name. (default: ${OPTION_DEFAULTS[OPTION_TYPE.CONFIG_FORMAT]})`).choices(CONFIG_FORMATS))
        .option('--ignore-config <config>', '(optional) Config to ignore from being displayed (often used for an `all` config) (option can be repeated).', collect, [])
        .option('--ignore-deprecated-rules [boolean]', `(optional) Whether to ignore deprecated rules from being checked, displayed, or updated. (default: ${String(OPTION_DEFAULTS[OPTION_TYPE.IGNORE_DEPRECATED_RULES])})`, parseBoolean)
        .option('--init-rule-docs [boolean]', `(optional) Whether to create rule doc files if they don't yet exist. (default: ${String(OPTION_DEFAULTS[OPTION_TYPE.INIT_RULE_DOCS])})`, parseBoolean)
        .option('--path-rule-doc <path>', `(optional) Path to markdown file for each rule doc. Use \`{name}\` placeholder for the rule name. To specify a function, use a JavaScript-based config file. (default: ${OPTION_DEFAULTS[OPTION_TYPE.PATH_RULE_DOC]})`)
        .option('--path-rule-list <path>', `(optional) Path to markdown file where the rules table list should live. Option can be repeated. Defaults to ${String(OPTION_DEFAULTS[OPTION_TYPE.PATH_RULE_LIST])} if not provided.`, collect, [])
        .option('--rule-doc-notices <notices>', `(optional) Ordered, comma-separated list of notices to display in rule doc. Non-applicable notices will be hidden. (choices: "${Object.values(NOTICE_TYPE).join('", "')}") (default: ${String(OPTION_DEFAULTS[OPTION_TYPE.RULE_DOC_NOTICES])})`, collectCSV, [])
        .option('--rule-doc-section-exclude <section>', '(optional) Disallowed section in each rule doc (option can be repeated).', collect, [])
        .option('--rule-doc-section-include <section>', '(optional) Required section in each rule doc (option can be repeated).', collect, [])
        .option('--rule-doc-section-options [boolean]', `(optional) Whether to require an "Options" or "Config" rule doc section and mention of any named options for rules with options. (default: ${String(OPTION_DEFAULTS[OPTION_TYPE.RULE_DOC_SECTION_OPTIONS])})`, parseBoolean)
        .addOption(new Option('--rule-doc-title-format <format>', `(optional) The format to use for rule doc titles. (default: ${OPTION_DEFAULTS[OPTION_TYPE.RULE_DOC_TITLE_FORMAT]})`).choices(RULE_DOC_TITLE_FORMATS))
        .option('--rule-list-columns <columns>', `(optional) Ordered, comma-separated list of columns to display in rule list. Empty columns will be hidden. (choices: "${Object.values(COLUMN_TYPE).join('", "')})" (default: ${String(OPTION_DEFAULTS[OPTION_TYPE.RULE_LIST_COLUMNS])})`, collectCSV, [])
        .option('--rule-list-split <property>', '(optional) Rule property(s) to split the rules list by. A separate list and header will be created for each value. Example: `meta.type`. To specify a function, use a JavaScript-based config file.', collectCSV, [])
        .option('--url-configs <url>', '(optional) Link to documentation about the ESLint configurations exported by the plugin.')
        .option('--url-rule-doc <url>', '(optional) Link to documentation for each rule. Useful when it differs from the rule doc path on disk (e.g. custom documentation site in use). Use `{name}` placeholder for the rule name. To specify a function, use a JavaScript-based config file.')
        .action(async function (path, options) {
        // Load config file options and merge with CLI options.
        // CLI options take precedence.
        // For this to work, we can't have any default values from the CLI options that will override the config file options (except empty arrays, as arrays will be merged).
        // Default values should be handled in the callback function.
        const configFileOptions = await loadConfigFileOptions();
        const generateOptions = merge(configFileOptions, options); // Recursive merge.
        // Options with both a CLI/config-file variant will lose the function value during the merge, so restore it here.
        // TODO: figure out a better way to handle this.
        /* istanbul ignore next -- TODO: haven't tested JavaScript config files yet https://github.com/bmish/eslint-doc-generator/issues/366 */
        if (typeof configFileOptions.ruleListSplit === 'function') {
            // @ts-expect-error -- The array is supposed to be read-only at this point.
            generateOptions.ruleListSplit = configFileOptions.ruleListSplit;
        }
        // Invoke callback.
        await cb(path, generateOptions);
    })
        .parseAsync(argv);
    return program;
}
