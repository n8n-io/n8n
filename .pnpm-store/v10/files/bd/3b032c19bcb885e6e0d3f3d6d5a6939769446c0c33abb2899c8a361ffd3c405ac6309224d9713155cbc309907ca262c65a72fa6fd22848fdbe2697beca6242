import * as path from "path";
import * as fs from "fs";
// eslint-disable-next-line @typescript-eslint/no-require-imports
import JSON5 = require("json5");
// eslint-disable-next-line @typescript-eslint/no-require-imports
import StripBom = require("strip-bom");

/**
 * Typing for the parts of tsconfig that we care about
 */
export interface Tsconfig {
  extends?: string | string[];
  compilerOptions?: {
    baseUrl?: string;
    paths?: { [key: string]: Array<string> };
    strict?: boolean;
  };
}

export interface TsConfigLoaderResult {
  tsConfigPath: string | undefined;
  baseUrl: string | undefined;
  paths: { [key: string]: Array<string> } | undefined;
}

export interface TsConfigLoaderParams {
  getEnv: (key: string) => string | undefined;
  cwd: string;
  loadSync?(
    cwd: string,
    filename?: string,
    baseUrl?: string
  ): TsConfigLoaderResult;
}

export function tsConfigLoader({
  getEnv,
  cwd,
  loadSync = loadSyncDefault,
}: TsConfigLoaderParams): TsConfigLoaderResult {
  const TS_NODE_PROJECT = getEnv("TS_NODE_PROJECT");
  const TS_NODE_BASEURL = getEnv("TS_NODE_BASEURL");

  // tsconfig.loadSync handles if TS_NODE_PROJECT is a file or directory
  // and also overrides baseURL if TS_NODE_BASEURL is available.
  const loadResult = loadSync(cwd, TS_NODE_PROJECT, TS_NODE_BASEURL);
  return loadResult;
}

function loadSyncDefault(
  cwd: string,
  filename?: string,
  baseUrl?: string
): TsConfigLoaderResult {
  // Tsconfig.loadSync uses path.resolve. This is why we can use an absolute path as filename

  const configPath = resolveConfigPath(cwd, filename);

  if (!configPath) {
    return {
      tsConfigPath: undefined,
      baseUrl: undefined,
      paths: undefined,
    };
  }
  const config = loadTsconfig(configPath);

  return {
    tsConfigPath: configPath,
    baseUrl:
      baseUrl ||
      (config && config.compilerOptions && config.compilerOptions.baseUrl),
    paths: config && config.compilerOptions && config.compilerOptions.paths,
  };
}

function resolveConfigPath(cwd: string, filename?: string): string | undefined {
  if (filename) {
    const absolutePath = fs.lstatSync(filename).isDirectory()
      ? path.resolve(filename, "./tsconfig.json")
      : path.resolve(cwd, filename);

    return absolutePath;
  }

  if (fs.statSync(cwd).isFile()) {
    return path.resolve(cwd);
  }

  const configAbsolutePath = walkForTsConfig(cwd);
  return configAbsolutePath ? path.resolve(configAbsolutePath) : undefined;
}
export function walkForTsConfig(
  directory: string,
  readdirSync: (path: string) => string[] = fs.readdirSync
): string | undefined {
  const files = readdirSync(directory);
  const filesToCheck = ["tsconfig.json", "jsconfig.json"];
  for (const fileToCheck of filesToCheck) {
    if (files.indexOf(fileToCheck) !== -1) {
      return path.join(directory, fileToCheck);
    }
  }

  const parentDirectory = path.dirname(directory);

  // If we reached the top
  if (directory === parentDirectory) {
    return undefined;
  }

  return walkForTsConfig(parentDirectory, readdirSync);
}

export function loadTsconfig(
  configFilePath: string,
  // eslint-disable-next-line no-shadow
  existsSync: (path: string) => boolean = fs.existsSync,
  readFileSync: (filename: string) => string = (filename: string) =>
    fs.readFileSync(filename, "utf8")
): Tsconfig | undefined {
  if (!existsSync(configFilePath)) {
    return undefined;
  }

  const configString = readFileSync(configFilePath);
  const cleanedJson = StripBom(configString);
  let config: Tsconfig;
  try {
    config = JSON5.parse(cleanedJson);
  } catch (e) {
    throw new Error(`${configFilePath} is malformed ${e.message}`);
  }

  let extendedConfig = config.extends;
  if (extendedConfig) {
    let base: Tsconfig;

    if (Array.isArray(extendedConfig)) {
      base = extendedConfig.reduce(
        (currBase, extendedConfigElement) =>
          mergeTsconfigs(
            currBase,
            loadTsconfigFromExtends(
              configFilePath,
              extendedConfigElement,
              existsSync,
              readFileSync
            )
          ),
        {}
      );
    } else {
      base = loadTsconfigFromExtends(
        configFilePath,
        extendedConfig,
        existsSync,
        readFileSync
      );
    }

    return mergeTsconfigs(base, config);
  }
  return config;
}

/**
 * Intended to be called only from loadTsconfig.
 * Parameters don't have defaults because they should use the same as loadTsconfig.
 */
function loadTsconfigFromExtends(
  configFilePath: string,
  extendedConfigValue: string,
  // eslint-disable-next-line no-shadow
  existsSync: (path: string) => boolean,
  readFileSync: (filename: string) => string
): Tsconfig {
  if (
    typeof extendedConfigValue === "string" &&
    extendedConfigValue.indexOf(".json") === -1
  ) {
    extendedConfigValue += ".json";
  }
  const currentDir = path.dirname(configFilePath);
  let extendedConfigPath = path.join(currentDir, extendedConfigValue);
  if (
    extendedConfigValue.indexOf("/") !== -1 &&
    extendedConfigValue.indexOf(".") !== -1 &&
    !existsSync(extendedConfigPath)
  ) {
    extendedConfigPath = path.join(
      currentDir,
      "node_modules",
      extendedConfigValue
    );
  }

  const config =
    loadTsconfig(extendedConfigPath, existsSync, readFileSync) || {};

  // baseUrl should be interpreted as relative to extendedConfigPath,
  // but we need to update it so it is relative to the original tsconfig being loaded
  if (config.compilerOptions?.baseUrl) {
    const extendsDir = path.dirname(extendedConfigValue);
    config.compilerOptions.baseUrl = path.join(
      extendsDir,
      config.compilerOptions.baseUrl
    );
  }

  return config;
}

function mergeTsconfigs(
  base: Tsconfig | undefined,
  config: Tsconfig | undefined
): Tsconfig {
  base = base || {};
  config = config || {};

  return {
    ...base,
    ...config,
    compilerOptions: {
      ...base.compilerOptions,
      ...config.compilerOptions,
    },
  };
}
