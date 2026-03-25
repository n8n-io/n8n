import * as colorette from 'colorette';
import * as chockidar from 'chokidar';
import { bundle, RedoclyClient, getTotals, getMergedConfig, Config } from '@redocly/openapi-core';
import {
  getFallbackApisOrExit,
  handleError,
  loadConfigAndHandleErrors,
} from '../../utils/miscellaneous';
import startPreviewServer from './preview-server/preview-server';

import type { Skips, VerifyConfigOptions } from '../../types';
import type { CommandArgs } from '../../wrapper';

export type PreviewDocsOptions = {
  port: number;
  host: string;
  'use-community-edition'?: boolean;
  config?: string;
  api?: string;
  force?: boolean;
} & Omit<Skips, 'skip-rule'> &
  VerifyConfigOptions;

export async function previewDocs({
  argv,
  config: configFromFile,
}: CommandArgs<PreviewDocsOptions>) {
  let isAuthorizedWithRedocly = false;
  let redocOptions: any = {};
  let config = await reloadConfig(configFromFile);

  const apis = await getFallbackApisOrExit(argv.api ? [argv.api] : [], config);
  const api = apis[0];

  let cachedBundle: any;
  const deps = new Set<string>();

  async function getBundle() {
    return cachedBundle;
  }

  async function updateBundle() {
    process.stdout.write('\nBundling...\n\n');
    try {
      const {
        bundle: openapiBundle,
        problems,
        fileDependencies,
      } = await bundle({
        ref: api.path,
        config,
      });
      const removed = [...deps].filter((x) => !fileDependencies.has(x));
      watcher.unwatch(removed);
      watcher.add([...fileDependencies]);
      deps.clear();
      fileDependencies.forEach(deps.add, deps);

      const fileTotals = getTotals(problems);

      if (fileTotals.errors === 0) {
        process.stdout.write(
          fileTotals.errors === 0
            ? `Created a bundle for ${api.alias || api.path} ${
                fileTotals.warnings > 0 ? 'with warnings' : 'successfully'
              }\n`
            : colorette.yellow(
                `Created a bundle for ${
                  api.alias || api.path
                } with errors. Docs may be broken or not accurate\n`
              )
        );
      }

      return openapiBundle.parsed;
    } catch (e) {
      handleError(e, api.path);
    }
  }

  setImmediate(() => {
    cachedBundle = updateBundle();
  }); // initial cache

  const isAuthorized = isAuthorizedWithRedocly || redocOptions.licenseKey;
  if (!isAuthorized) {
    process.stderr.write(
      `Using Redoc community edition.\nLogin with redocly ${colorette.blue(
        'login'
      )} or use an enterprise license key to preview with the premium docs.\n\n`
    );
  }

  const hotClients = await startPreviewServer(argv.port, argv.host, {
    getBundle,
    getOptions: () => redocOptions,
    useRedocPro: isAuthorized && !redocOptions.useCommunityEdition,
  });

  const watchPaths = [api.path, config.configFile!].filter((e) => !!e);
  const watcher = chockidar.watch(watchPaths, {
    disableGlobbing: true,
    ignoreInitial: true,
  });

  const debouncedUpdatedBundle = debounce(async () => {
    cachedBundle = updateBundle();
    await cachedBundle;
    hotClients.broadcast('{"type": "reload", "bundle": true}');
  }, 2000);

  const changeHandler = async (type: string, file: string) => {
    process.stdout.write(`${colorette.green('watch')} ${type} ${colorette.blue(file)}\n`);
    if (file === config.configFile) {
      config = await reloadConfig();
      hotClients.broadcast(JSON.stringify({ type: 'reload' }));
      return;
    }

    debouncedUpdatedBundle();
  };

  watcher.on('change', changeHandler.bind(undefined, 'changed'));
  watcher.on('add', changeHandler.bind(undefined, 'added'));
  watcher.on('unlink', changeHandler.bind(undefined, 'removed'));

  watcher.on('ready', () => {
    process.stdout.write(
      `\n  👀  Watching ${colorette.blue(api.path)} and all related resources for changes\n\n`
    );
  });

  async function reloadConfig(config?: Config) {
    if (!config) {
      try {
        config = (await loadConfigAndHandleErrors({ configPath: argv.config })) as Config;
      } catch (err) {
        config = new Config({ apis: {}, styleguide: {} });
      }
    }
    const redoclyClient = new RedoclyClient();
    isAuthorizedWithRedocly = await redoclyClient.isAuthorizedWithRedocly();
    const resolvedConfig = getMergedConfig(config, argv.api);
    const { styleguide } = resolvedConfig;

    styleguide.skipPreprocessors(argv['skip-preprocessor']);
    styleguide.skipDecorators(argv['skip-decorator']);

    const referenceDocs = resolvedConfig.theme?.openapi;
    redocOptions = {
      ...referenceDocs,
      useCommunityEdition: argv['use-community-edition'] || referenceDocs?.useCommunityEdition,
      licenseKey: process.env.REDOCLY_LICENSE_KEY || referenceDocs?.licenseKey,
      whiteLabel: true,
    };
    return resolvedConfig;
  }
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function debounce(func: Function, wait: number, immediate?: boolean) {
  let timeout: NodeJS.Timeout | null;

  return function executedFunction(...args: any[]) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const context = this;

    const later = () => {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };

    const callNow = immediate && !timeout;

    if (timeout) clearTimeout(timeout);

    timeout = setTimeout(later, wait);

    if (callNow) func.apply(context, args);
  };
}
