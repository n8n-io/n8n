/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type {Config} from '@jest/types';
import type {DeprecatedOptions} from 'jest-validate';

declare type AllOptions = Config.ProjectConfig & Config.GlobalConfig;

declare namespace constants {
  export {
    NODE_MODULES,
    DEFAULT_JS_PATTERN,
    PACKAGE_JSON,
    JEST_CONFIG_BASE_NAME,
    JEST_CONFIG_EXT_CJS,
    JEST_CONFIG_EXT_MJS,
    JEST_CONFIG_EXT_JS,
    JEST_CONFIG_EXT_TS,
    JEST_CONFIG_EXT_JSON,
    JEST_CONFIG_EXT_ORDER,
  };
}
export {constants};

declare const DEFAULT_JS_PATTERN = '\\.[jt]sx?$';

export declare const defaults: Config.DefaultOptions;

export declare const deprecationEntries: DeprecatedOptions;

export declare const descriptions: {
  [key in keyof Config.InitialOptions]: string;
};

export declare const isJSONString: (
  text?: JSONString | string,
) => text is JSONString;

declare const JEST_CONFIG_BASE_NAME = 'jest.config';

declare const JEST_CONFIG_EXT_CJS = '.cjs';

declare const JEST_CONFIG_EXT_JS = '.js';

declare const JEST_CONFIG_EXT_JSON = '.json';

declare const JEST_CONFIG_EXT_MJS = '.mjs';

declare const JEST_CONFIG_EXT_ORDER: readonly string[];

declare const JEST_CONFIG_EXT_TS = '.ts';

declare type JSONString = string & {
  readonly $$type: never;
};

declare const NODE_MODULES: string;

export declare function normalize(
  initialOptions: Config.InitialOptions,
  argv: Config.Argv,
  configPath?: string | null,
  projectIndex?: number,
  isProjectOptions?: boolean,
): Promise<{
  hasDeprecationWarnings: boolean;
  options: AllOptions;
}>;

declare const PACKAGE_JSON = 'package.json';

declare type ReadConfig = {
  configPath: string | null | undefined;
  globalConfig: Config.GlobalConfig;
  hasDeprecationWarnings: boolean;
  projectConfig: Config.ProjectConfig;
};

export declare function readConfig(
  argv: Config.Argv,
  packageRootOrConfig: string | Config.InitialOptions,
  skipArgvConfigOption?: boolean,
  parentConfigDirname?: string | null,
  projectIndex?: number,
  skipMultipleConfigError?: boolean,
): Promise<ReadConfig>;

export declare function readConfigs(
  argv: Config.Argv,
  projectPaths: Array<string>,
): Promise<{
  globalConfig: Config.GlobalConfig;
  configs: Array<Config.ProjectConfig>;
  hasDeprecationWarnings: boolean;
}>;

/**
 * Reads the jest config, without validating them or filling it out with defaults.
 * @param config The path to the file or serialized config.
 * @param param1 Additional options
 * @returns The raw initial config (not validated)
 */
export declare function readInitialOptions(
  config?: string,
  {
    packageRootOrConfig,
    parentConfigDirname,
    readFromCwd,
    skipMultipleConfigError,
  }?: ReadJestConfigOptions,
): Promise<{
  config: Config.InitialOptions;
  configPath: string | null;
}>;

export declare interface ReadJestConfigOptions {
  /**
   * The package root or deserialized config (default is cwd)
   */
  packageRootOrConfig?: string | Config.InitialOptions;
  /**
   * When the `packageRootOrConfig` contains config, this parameter should
   * contain the dirname of the parent config
   */
  parentConfigDirname?: null | string;
  /**
   * Indicates whether or not to read the specified config file from disk.
   * When true, jest will read try to read config from the current working directory.
   * (default is false)
   */
  readFromCwd?: boolean;
  /**
   * Indicates whether or not to ignore the error of jest finding multiple config files.
   * (default is false)
   */
  skipMultipleConfigError?: boolean;
}

export declare const replaceRootDirInPath: (
  rootDir: string,
  filePath: string,
) => string;

export {};
