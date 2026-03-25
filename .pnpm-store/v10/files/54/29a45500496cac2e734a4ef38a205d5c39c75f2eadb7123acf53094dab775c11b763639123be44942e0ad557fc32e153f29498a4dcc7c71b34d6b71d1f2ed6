import { loadAndBundleSpec } from 'redoc';
import { dirname, resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import { performance } from 'perf_hooks';
import { getMergedConfig, isAbsoluteUrl } from '@redocly/openapi-core';
import { getObjectOrJSON, getPageHTML } from './utils';
import { exitWithError, getExecutionTime, getFallbackApisOrExit } from '../../utils/miscellaneous';

import type { BuildDocsArgv } from './types';
import type { CommandArgs } from '../../wrapper';

export const handlerBuildCommand = async ({
  argv,
  config: configFromFile,
  collectSpecData,
}: CommandArgs<BuildDocsArgv>) => {
  const startedAt = performance.now();

  const config = getMergedConfig(configFromFile, argv.api);
  const apis = await getFallbackApisOrExit(argv.api ? [argv.api] : [], config);
  const { path: pathToApi } = apis[0];

  const options = {
    output: argv.o,
    title: argv.title,
    disableGoogleFont: argv.disableGoogleFont,
    templateFileName: argv.template,
    templateOptions: argv.templateOptions || {},
    redocOptions: getObjectOrJSON(argv.theme?.openapi, config),
  };

  const redocCurrentVersion = require('../../../package.json').dependencies.redoc;

  try {
    const elapsed = getExecutionTime(startedAt);

    const api = await loadAndBundleSpec(isAbsoluteUrl(pathToApi) ? pathToApi : resolve(pathToApi));
    collectSpecData?.(api);
    const pageHTML = await getPageHTML(
      api,
      pathToApi,
      { ...options, redocCurrentVersion },
      argv.config
    );

    mkdirSync(dirname(options.output), { recursive: true });
    writeFileSync(options.output, pageHTML);
    const sizeInKiB = Math.ceil(Buffer.byteLength(pageHTML) / 1024);
    process.stdout.write(
      `\n🎉 bundled successfully in: ${options.output} (${sizeInKiB} KiB) [⏱ ${elapsed}].\n`
    );
  } catch (e) {
    exitWithError(e);
  }
};
