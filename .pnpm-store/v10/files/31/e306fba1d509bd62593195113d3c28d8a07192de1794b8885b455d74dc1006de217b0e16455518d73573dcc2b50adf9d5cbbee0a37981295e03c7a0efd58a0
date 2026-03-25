"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleBundle = handleBundle;
const perf_hooks_1 = require("perf_hooks");
const colorette_1 = require("colorette");
const fs_1 = require("fs");
const openapi_core_1 = require("@redocly/openapi-core");
const miscellaneous_1 = require("../utils/miscellaneous");
async function handleBundle({ argv, config, version, collectSpecData, }) {
    const removeUnusedComponents = argv['remove-unused-components'] ||
        config.rawConfig?.styleguide?.decorators?.hasOwnProperty('remove-unused-components');
    const apis = await (0, miscellaneous_1.getFallbackApisOrExit)(argv.apis, config);
    const totals = { errors: 0, warnings: 0, ignored: 0 };
    const deprecatedOptions = [];
    (0, miscellaneous_1.checkForDeprecatedOptions)(argv, deprecatedOptions);
    for (const { path, alias, output } of apis) {
        try {
            const startedAt = perf_hooks_1.performance.now();
            const resolvedConfig = (0, openapi_core_1.getMergedConfig)(config, alias);
            const { styleguide } = resolvedConfig;
            styleguide.skipPreprocessors(argv['skip-preprocessor']);
            styleguide.skipDecorators(argv['skip-decorator']);
            process.stderr.write((0, colorette_1.gray)(`bundling ${(0, miscellaneous_1.formatPath)(path)}...\n`));
            const { bundle: result, problems, ...meta } = await (0, openapi_core_1.bundle)({
                config: resolvedConfig,
                ref: path,
                dereference: argv.dereferenced,
                removeUnusedComponents,
                keepUrlRefs: argv['keep-url-references'],
                collectSpecData,
            });
            const fileTotals = (0, openapi_core_1.getTotals)(problems);
            const { outputFile, ext } = (0, miscellaneous_1.getOutputFileName)({
                entrypoint: path,
                output,
                argvOutput: argv.output,
                ext: argv.ext,
                entries: argv?.apis?.length || 0,
            });
            if (fileTotals.errors === 0 || argv.force) {
                if (!outputFile) {
                    const bundled = (0, miscellaneous_1.dumpBundle)((0, miscellaneous_1.sortTopLevelKeysForOas)(result.parsed), argv.ext || 'yaml', argv.dereferenced);
                    process.stdout.write(bundled);
                }
                else {
                    const bundled = (0, miscellaneous_1.dumpBundle)((0, miscellaneous_1.sortTopLevelKeysForOas)(result.parsed), ext, argv.dereferenced);
                    (0, miscellaneous_1.saveBundle)(outputFile, bundled);
                }
            }
            totals.errors += fileTotals.errors;
            totals.warnings += fileTotals.warnings;
            totals.ignored += fileTotals.ignored;
            (0, openapi_core_1.formatProblems)(problems, {
                format: 'codeframe',
                totals: fileTotals,
                version,
            });
            if (argv.metafile) {
                if (apis.length > 1) {
                    process.stderr.write((0, colorette_1.yellow)(`[WARNING] "--metafile" cannot be used with multiple apis. Skipping...`));
                }
                {
                    (0, fs_1.writeFileSync)(argv.metafile, JSON.stringify(meta), 'utf-8');
                }
            }
            const elapsed = (0, miscellaneous_1.getExecutionTime)(startedAt);
            if (fileTotals.errors > 0) {
                if (argv.force) {
                    process.stderr.write(`❓ Created a bundle for ${(0, colorette_1.blue)((0, miscellaneous_1.formatPath)(path))} at ${(0, colorette_1.blue)(outputFile || 'stdout')} with errors ${(0, colorette_1.green)(elapsed)}.\n${(0, colorette_1.yellow)('Errors ignored because of --force')}.\n`);
                }
                else {
                    process.stderr.write(`❌ Errors encountered while bundling ${(0, colorette_1.blue)((0, miscellaneous_1.formatPath)(path))}: bundle not created (use --force to ignore errors).\n`);
                }
            }
            else {
                process.stderr.write(`📦 Created a bundle for ${(0, colorette_1.blue)((0, miscellaneous_1.formatPath)(path))} at ${(0, colorette_1.blue)(outputFile || 'stdout')} ${(0, colorette_1.green)(elapsed)}.\n`);
            }
            const removedCount = meta.visitorsData?.['remove-unused-components']?.removedCount;
            if (removedCount) {
                process.stderr.write((0, colorette_1.gray)(`🧹 Removed ${removedCount} unused components.\n`));
            }
        }
        catch (e) {
            (0, miscellaneous_1.handleError)(e, path);
        }
    }
    (0, miscellaneous_1.printUnusedWarnings)(config.styleguide);
    if (!(totals.errors === 0 || argv.force)) {
        throw new Error('Bundle failed.');
    }
}
