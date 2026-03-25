"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleLint = handleLint;
exports.lintConfigCallback = lintConfigCallback;
const colorette_1 = require("colorette");
const perf_hooks_1 = require("perf_hooks");
const openapi_core_1 = require("@redocly/openapi-core");
const config_1 = require("@redocly/openapi-core/lib/config");
const utils_1 = require("@redocly/openapi-core/lib/utils");
const miscellaneous_1 = require("../utils/miscellaneous");
const getCommandNameFromArgs_1 = require("../utils/getCommandNameFromArgs");
async function handleLint({ argv, config, version, collectSpecData, }) {
    const apis = await (0, miscellaneous_1.getFallbackApisOrExit)(argv.apis, config);
    if (!apis.length) {
        (0, miscellaneous_1.exitWithError)('No APIs were provided.');
    }
    if (argv['generate-ignore-file']) {
        config.styleguide.ignore = {}; // clear ignore
    }
    const totals = { errors: 0, warnings: 0, ignored: 0 };
    let totalIgnored = 0;
    // TODO: use shared externalRef resolver, blocked by preprocessors now as they can mutate documents
    for (const { path, alias } of apis) {
        try {
            const startedAt = perf_hooks_1.performance.now();
            const resolvedConfig = (0, openapi_core_1.getMergedConfig)(config, alias);
            const { styleguide } = resolvedConfig;
            (0, miscellaneous_1.checkIfRulesetExist)(styleguide.rules);
            styleguide.skipRules(argv['skip-rule']);
            styleguide.skipPreprocessors(argv['skip-preprocessor']);
            if (styleguide.recommendedFallback) {
                process.stderr.write(`No configurations were provided -- using built in ${(0, colorette_1.blue)('recommended')} configuration by default.\n\n`);
            }
            process.stderr.write((0, colorette_1.gray)(`validating ${(0, miscellaneous_1.formatPath)(path)}...\n`));
            const results = await (0, openapi_core_1.lint)({
                ref: path,
                config: resolvedConfig,
                collectSpecData,
            });
            const fileTotals = (0, openapi_core_1.getTotals)(results);
            totals.errors += fileTotals.errors;
            totals.warnings += fileTotals.warnings;
            totals.ignored += fileTotals.ignored;
            if (argv['generate-ignore-file']) {
                for (const m of results) {
                    config.styleguide.addIgnore(m);
                    totalIgnored++;
                }
            }
            else {
                (0, openapi_core_1.formatProblems)(results, {
                    format: argv.format,
                    maxProblems: argv['max-problems'],
                    totals: fileTotals,
                    version,
                });
            }
            const elapsed = (0, miscellaneous_1.getExecutionTime)(startedAt);
            process.stderr.write((0, colorette_1.gray)(`${(0, miscellaneous_1.formatPath)(path)}: validated in ${elapsed}\n\n`));
        }
        catch (e) {
            (0, miscellaneous_1.handleError)(e, path);
        }
    }
    if (argv['generate-ignore-file']) {
        config.styleguide.saveIgnore();
        process.stderr.write(`Generated ignore file with ${totalIgnored} ${(0, utils_1.pluralize)('problem', totalIgnored)}.\n\n`);
    }
    else {
        (0, miscellaneous_1.printLintTotals)(totals, apis.length);
    }
    (0, miscellaneous_1.printUnusedWarnings)(config.styleguide);
    if (!(totals.errors === 0 || argv['generate-ignore-file'])) {
        throw new Error('Lint failed.');
    }
}
function lintConfigCallback(argv, version) {
    if (argv['lint-config'] === 'off') {
        return;
    }
    if (argv.format === 'json') {
        // we can't print config lint results as it will break json output
        return;
    }
    return async ({ document, resolvedRefMap, config, parsed: { theme = {} } }) => {
        const command = argv ? (0, getCommandNameFromArgs_1.getCommandNameFromArgs)(argv) : undefined;
        if (command === 'check-config') {
            (0, miscellaneous_1.notifyAboutIncompatibleConfigOptions)(theme.openapi);
        }
        const problems = await (0, openapi_core_1.lintConfig)({
            document,
            resolvedRefMap,
            config,
            severity: (argv['lint-config'] || 'warn'),
        });
        const fileTotals = (0, openapi_core_1.getTotals)(problems);
        (0, openapi_core_1.formatProblems)(problems, {
            format: argv.format,
            maxProblems: argv['max-problems'],
            totals: fileTotals,
            version,
        });
        (0, miscellaneous_1.printConfigLintTotals)(fileTotals, command);
        if (fileTotals.errors > 0) {
            throw new config_1.ConfigValidationError();
        }
    };
}
