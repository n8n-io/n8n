import { performance } from 'perf_hooks';
import { blue, gray, green, yellow } from 'colorette';
import { writeFileSync } from 'fs';
import { formatProblems, getTotals, getMergedConfig, bundle } from '@redocly/openapi-core';
import {
  dumpBundle,
  getExecutionTime,
  getFallbackApisOrExit,
  getOutputFileName,
  handleError,
  printUnusedWarnings,
  saveBundle,
  sortTopLevelKeysForOas,
  checkForDeprecatedOptions,
  formatPath,
} from '../utils/miscellaneous';

import type { OutputExtensions, Skips, Totals, VerifyConfigOptions } from '../types';
import type { CommandArgs } from '../wrapper';

export type BundleOptions = {
  apis?: string[];
  extends?: string[];
  output?: string;
  ext?: OutputExtensions;
  dereferenced?: boolean;
  force?: boolean;
  metafile?: string;
  'remove-unused-components'?: boolean;
  'keep-url-references'?: boolean;
} & Skips &
  VerifyConfigOptions;

export async function handleBundle({
  argv,
  config,
  version,
  collectSpecData,
}: CommandArgs<BundleOptions>) {
  const removeUnusedComponents =
    argv['remove-unused-components'] ||
    config.rawConfig?.styleguide?.decorators?.hasOwnProperty('remove-unused-components');
  const apis = await getFallbackApisOrExit(argv.apis, config);
  const totals: Totals = { errors: 0, warnings: 0, ignored: 0 };
  const deprecatedOptions: Array<keyof BundleOptions> = [];

  checkForDeprecatedOptions(argv, deprecatedOptions);

  for (const { path, alias, output } of apis) {
    try {
      const startedAt = performance.now();
      const resolvedConfig = getMergedConfig(config, alias);
      const { styleguide } = resolvedConfig;

      styleguide.skipPreprocessors(argv['skip-preprocessor']);
      styleguide.skipDecorators(argv['skip-decorator']);

      process.stderr.write(gray(`bundling ${formatPath(path)}...\n`));

      const {
        bundle: result,
        problems,
        ...meta
      } = await bundle({
        config: resolvedConfig,
        ref: path,
        dereference: argv.dereferenced,
        removeUnusedComponents,
        keepUrlRefs: argv['keep-url-references'],
        collectSpecData,
      });

      const fileTotals = getTotals(problems);
      const { outputFile, ext } = getOutputFileName({
        entrypoint: path,
        output,
        argvOutput: argv.output,
        ext: argv.ext,
        entries: argv?.apis?.length || 0,
      });

      if (fileTotals.errors === 0 || argv.force) {
        if (!outputFile) {
          const bundled = dumpBundle(
            sortTopLevelKeysForOas(result.parsed),
            argv.ext || 'yaml',
            argv.dereferenced
          );
          process.stdout.write(bundled);
        } else {
          const bundled = dumpBundle(sortTopLevelKeysForOas(result.parsed), ext, argv.dereferenced);
          saveBundle(outputFile, bundled);
        }
      }

      totals.errors += fileTotals.errors;
      totals.warnings += fileTotals.warnings;
      totals.ignored += fileTotals.ignored;

      formatProblems(problems, {
        format: 'codeframe',
        totals: fileTotals,
        version,
      });

      if (argv.metafile) {
        if (apis.length > 1) {
          process.stderr.write(
            yellow(`[WARNING] "--metafile" cannot be used with multiple apis. Skipping...`)
          );
        }
        {
          writeFileSync(argv.metafile, JSON.stringify(meta), 'utf-8');
        }
      }

      const elapsed = getExecutionTime(startedAt);
      if (fileTotals.errors > 0) {
        if (argv.force) {
          process.stderr.write(
            `❓ Created a bundle for ${blue(formatPath(path))} at ${blue(
              outputFile || 'stdout'
            )} with errors ${green(elapsed)}.\n${yellow('Errors ignored because of --force')}.\n`
          );
        } else {
          process.stderr.write(
            `❌ Errors encountered while bundling ${blue(
              formatPath(path)
            )}: bundle not created (use --force to ignore errors).\n`
          );
        }
      } else {
        process.stderr.write(
          `📦 Created a bundle for ${blue(formatPath(path))} at ${blue(
            outputFile || 'stdout'
          )} ${green(elapsed)}.\n`
        );
      }

      const removedCount = meta.visitorsData?.['remove-unused-components']?.removedCount;
      if (removedCount) {
        process.stderr.write(gray(`🧹 Removed ${removedCount} unused components.\n`));
      }
    } catch (e) {
      handleError(e, path);
    }
  }

  printUnusedWarnings(config.styleguide);

  if (!(totals.errors === 0 || argv.force)) {
    throw new Error('Bundle failed.');
  }
}
