'use strict';

const fs = require('fs');
const path = require('path');
const { debuglog } = require('util');
const appModulePath = require('app-module-path');
const sassLookup = require('sass-lookup');
const stylusLookup = require('stylus-lookup');
const { createMatchPath } = require('tsconfig-paths');

const debug = debuglog('cabinet');

/*
 * Most JS resolvers are lazy-loaded (only required when needed)
 * e.g. dont load requirejs when we only have commonjs modules to resolve
 * this makes testing your code using this lib much easier
 */

let getModuleType;
let resolve;
let amdLookup;
let ts;
let resolveDependencyPath;
let webpackResolve;

const defaultLookups = {
  '.js': jsLookup,
  '.jsx': jsLookup,
  '.less': sassLookup, // Less and Sass imports are very similar
  '.sass': sassLookup,
  '.scss': sassLookup,
  '.styl': stylusLookup,
  '.ts': tsLookup,
  '.tsx': tsLookup,
  '.vue': vueLookup
};

/**
 * @param {Object} options
 * @param {String} options.partial The dependency being looked up
 * @param {String} options.filename The file that contains the dependency being looked up
 * @param {String|Object} [options.config] Path to a requirejs config
 * @param {String} [options.configPath] For AMD resolution, if the config is an object, this represents the location of the config file.
 * @param {Object} [options.nodeModulesConfig] Config for overriding the entry point defined in a package json file
 * @param {String} [options.nodeModulesConfig.entry] The new value for "main" in package json
 * @param {String} [options.webpackConfig] Path to the webpack config
 * @param {Object} [options.ast] A preparsed AST for the file identified by filename.
 * @param {String|Object} [options.tsConfig] Path to a typescript configuration or an object representing a pre-parsed typescript config.
 * @param {String} [options.tsConfigPath] A (virtual) Path to typescript config file when options.tsConfig is given as an object. Needed to calculate [Path Mapping](https://www.typescriptlang.org/docs/handbook/module-resolution.html#path-mapping). If not given when options.tsConfig is an object, Path Mapping is not considered.
 * @param {Boolean} [options.noTypeDefinitions] Whether to return '.d.ts' files or '.js' files for a dependency
 */
module.exports = function(options = {}) {
  const { partial, filename } = options;
  const ext = path.extname(filename);

  debug(`Given filename: ${filename}`);
  debug(`which has the extension: ${ext}`);

  let resolver = defaultLookups[ext];

  if (!resolver) {
    debug('using generic resolver');
    resolveDependencyPath ||= require('resolve-dependency-path');

    resolver = resolveDependencyPath;
  }

  debug(`found a resolver for ${ext}`);

  options.dependency = partial;
  const result = resolver(options);

  debug(`resolved path for ${partial}: ${result}`);
  return result;
};

module.exports.supportedFileExtensions = Object.keys(defaultLookups);

/**
 * Register a custom lookup resolver for a file extension
 *
 * @param  {String} extension - The file extension that should use the resolver
 * @param  {Function} lookupStrategy - A resolver of partial paths
 */
module.exports.register = function(extension, lookupStrategy) {
  defaultLookups[extension] = lookupStrategy;

  if (!this.supportedFileExtensions.includes(extension)) {
    this.supportedFileExtensions.push(extension);
  }
};

/**
 * Unregister a custom lookup resolver for a file extension
 *
 * @param  {String} extension - The file extension whose resolver should be removed
 */
module.exports.unregister = function(extension) {
  delete defaultLookups[extension];
  module.exports.supportedFileExtensions = Object.keys(defaultLookups);
};

/**
 * Exposed for testing
 *
 * @param  {Object} options
 * @param  {String} options.config
 * @param  {String} options.webpackConfig
 * @param  {String} options.filename
 * @param  {Object} options.ast
 * @return {String}
 */
module.exports._getJSType = function(options = {}) {
  getModuleType ||= require('module-definition');

  if (options.config) {
    return 'amd';
  }

  if (options.webpackConfig) {
    return 'webpack';
  }

  if (options.ast) {
    debug('reusing the given ast');
    return getModuleType.fromSource(options.ast);
  }

  debug('using the filename to find the module type');
  return getModuleType.sync(options.filename);
};

function getCompilerOptionsFromTsConfig(tsConfig) {
  ts ||= require('typescript');

  debug(`given typescript config: ${tsConfig}`);
  let compilerOptions = {};

  if (!tsConfig) {
    debug('no tsconfig given, defaulting');
  } else if (typeof tsConfig === 'string') {
    debug('string tsconfig given, parsing');

    try {
      const tsParsedConfig = ts.readJsonConfigFile(tsConfig, ts.sys.readFile);
      compilerOptions = ts.parseJsonSourceFileConfigFileContent(tsParsedConfig, ts.sys, path.dirname(tsConfig)).options;
      debug('successfully parsed tsconfig');
    } catch {
      debug('could not parse tsconfig');
      throw new Error('could not read tsconfig');
    }
  } else if ('compilerOptions' in tsConfig) {
    debug('raw tsconfig json given, parsing');
    compilerOptions = ts.convertCompilerOptionsFromJson(tsConfig.compilerOptions).options;
  } else {
    debug('parsed tsconfig given, plucking options');
    compilerOptions = tsConfig.options;
  }

  debug(`processed typescript config: ${tsConfig}`);
  debug(`processed typescript config type: ${typeof tsConfig}`);

  return compilerOptions;
}

/**
 * @private
 * @param  {Object} options
 * @param  {String} options.dependency
 * @param  {String} options.filename
 * @param  {String} options.directory
 * @param  {String} [options.config]
 * @param  {String} [options.webpackConfig]
 * @param  {String} [options.configPath]
 * @param  {Object} [options.nodeModulesConfig]
 * @param  {Object} [options.ast]
 * @return {String}
 */
function jsLookup(options) {
  const { dependency, filename, directory, config, webpackConfig, configPath, ast } = options;
  const type = module.exports._getJSType({
    config,
    webpackConfig,
    filename,
    ast
  });

  switch (type) {
    case 'amd': {
      debug('using amd resolver');
      amdLookup ||= require('module-lookup-amd');

      return amdLookup({
        config,
        // Optional in case a pre-parsed config is being passed in
        configPath,
        partial: dependency,
        directory,
        filename
      });
    }

    case 'commonjs':
    case 'es6': {
      debug('using commonjs resolver for commonjs/es6');
      return commonJSLookup(options);
    }

    case 'webpack': {
      debug('using webpack resolver for es6');
      return resolveWebpackPath({
        dependency,
        filename,
        directory,
        webpackConfig
      });
    }

    default: {
      return commonJSLookup(options);
    }
  }
}

function tsLookup({ dependency, filename, directory, webpackConfig, tsConfig, tsConfigPath, noTypeDefinitions }) {
  debug('performing a typescript lookup');

  if (typeof tsConfig === 'string') {
    tsConfigPath ||= path.dirname(tsConfig);
  }

  if (!tsConfig && webpackConfig) {
    debug('using webpack resolver for typescript');
    return resolveWebpackPath({
      dependency,
      filename,
      directory,
      webpackConfig
    });
  }

  const compilerOptions = getCompilerOptionsFromTsConfig(tsConfig);
  const host = ts.createCompilerHost({});

  debug('with options: %o', compilerOptions);

  const namedModule = ts.resolveModuleName(dependency, filename, compilerOptions, host);
  let result = '';

  if (namedModule.resolvedModule) {
    result = namedModule.resolvedModule.resolvedFileName;

    if (namedModule.resolvedModule.extension === '.d.ts' && noTypeDefinitions) {
      const resolvedFileNameWithoutExtension = result.replace(namedModule.resolvedModule.extension, '');
      try {
        result = ts.resolveJSModule(resolvedFileNameWithoutExtension, path.dirname(filename), host);
      } catch (error) {
        debug(`ts.resolveJSModule threw an Error: ${error.message}`);
      }
    }
  } else {
    const suffix = '.d.ts';
    const lookUpLocations = (namedModule.failedLookupLocations ?? [])
      .filter(string => string.endsWith(suffix))
      .map(string => string.substr(0, string.length - suffix.length));

    result = lookUpLocations.find(location => ts.sys.fileExists(location)) || '';
  }

  if (!result && tsConfigPath && compilerOptions.baseUrl && compilerOptions.paths) {
    const absoluteBaseUrl = path.join(path.dirname(tsConfigPath), compilerOptions.baseUrl);
    // REF: https://github.com/dividab/tsconfig-paths#creatematchpath
    const tsMatchPath = createMatchPath(absoluteBaseUrl, compilerOptions.paths);
    const extensions = [
      '.ts',
      '.tsx',
      '.d.ts',
      '.js',
      '.jsx',
      '.json',
      '.node'
    ];
    // REF: https://github.com/dividab/tsconfig-paths#creatematchpath
    // Get absolute path by ts path mapping. `undefined` if non-existent
    const resolvedTsAliasPath = tsMatchPath(dependency, undefined, undefined, extensions);

    if (resolvedTsAliasPath) {
      const stat = (() => {
        try {
          // fs.statSync throws an error if path is non-existent
          return fs.statSync(resolvedTsAliasPath);
        } catch {
          return undefined;
        }
      })();

      if (stat) {
        if (stat.isDirectory()) {
          // When directory is imported, index file is resolved
          for (const ext of extensions) {
            const filename = path.join(resolvedTsAliasPath, `index${ext}`);
            if (fs.existsSync(filename)) {
              result = filename;
              break;
            }
          }
        } else {
          // if the path is complete filename
          result = resolvedTsAliasPath;
        }
      } else {
        // For cases a file extension is omitted when being imported
        for (const ext of extensions) {
          const filenameWithExt = resolvedTsAliasPath + ext;
          if (fs.existsSync(filenameWithExt)) {
            result = filenameWithExt;
            break;
          }
        }
      }
    }
  }

  debug(`result: ${result}`);
  return result ? path.resolve(result) : '';
}

function commonJSLookup(options) {
  const { filename, directory, nodeModulesConfig, tsConfig } = options;
  let { dependency } = options;

  resolve ||= require('resolve');

  if (!dependency) {
    debug('blank dependency given. Returning early.');
    return '';
  }

  // Need to resolve partials within the directory of the module, not filing-cabinet
  const moduleLookupDir = path.join(directory, 'node_modules');

  debug(`adding ${moduleLookupDir} to the require resolution paths`);

  appModulePath.addPath(moduleLookupDir);

  // Make sure the partial is being resolved to the filename's context
  // 3rd party modules will not be relative
  if (dependency[0] === '.') {
    dependency = path.resolve(path.dirname(filename), dependency);
  }

  // Allows us to configure what is used as the "main" entry point
  function packageFilter(packageJson) {
    packageJson.main = packageJson[nodeModulesConfig.entry] ?? packageJson.main;
    return packageJson;
  }

  const tsCompilerOptions = getCompilerOptionsFromTsConfig(tsConfig);
  const allowMixedJsAndTs = tsCompilerOptions.allowJs;
  let extensions = ['.js', '.jsx'];
  let result = '';

  if (allowMixedJsAndTs) {
    // Let the typescript engine take a stab at resolving this one. This lookup will
    // respect any custom paths in tsconfig.json
    result = tsLookup(options);
    if (result) {
      debug(`typescript successfully resolved commonjs module: ${result}`);
      return result;
    }

    // Otherwise, let the commonJS resolver look for plain .ts file imports.
    extensions = [...extensions, '.ts', '.tsx'];
  }

  try {
    result = resolve.sync(dependency, {
      extensions,
      basedir: directory,
      packageFilter: nodeModulesConfig && nodeModulesConfig.entry ? packageFilter : undefined,
      // Add fileDir to resolve index.js files in that dir
      moduleDirectory: ['node_modules', directory]
    });
    debug(`resolved path: ${result}`);
  } catch {
    debug(`could not resolve ${dependency}`);
  }

  return result;
}

function vueLookup(options) {
  const { dependency } = options;

  if (!dependency) {
    debug('blank dependency given. Returning early.');
    return '';
  }

  if (dependency.endsWith('.js') || dependency.endsWith('.jsx')) {
    return jsLookup(options);
  }

  if (dependency.endsWith('.ts') || dependency.endsWith('.tsx')) {
    return tsLookup(options);
  }

  if (dependency.endsWith('.scss') || dependency.endsWith('.sass') || dependency.endsWith('.less')) {
    return sassLookup(options);
  }

  if (dependency.endsWith('.styl')) {
    return stylusLookup(options);
  }

  if (options.tsConfig || options.tsConfigPath) {
    return tsLookup(options);
  }

  return jsLookup(options);
}

function resolveWebpackPath({ dependency, filename, directory, webpackConfig }) {
  webpackResolve ||= require('enhanced-resolve');

  webpackConfig = path.resolve(webpackConfig);
  let loadedConfig;

  try {
    loadedConfig = require(webpackConfig);

    if (typeof loadedConfig === 'function') {
      loadedConfig = loadedConfig();
    }

    if (Array.isArray(loadedConfig)) {
      loadedConfig = loadedConfig[0];
    }
  } catch (error) {
    debug(`error loading the webpack config at ${webpackConfig}`);
    debug(error.message);
    debug(error.stack);
    return '';
  }

  const resolveConfig = { ...loadedConfig.resolve };

  if (!resolveConfig.modules && (resolveConfig.root || resolveConfig.roots || resolveConfig.modulesDirectories)) {
    resolveConfig.modules = [];

    // `resolve.root` is a string, maybe used in webpack 1.x.
    // here: https://github.com/webpack/webpack/issues/472#issuecomment-166946925
    if (typeof resolveConfig.root === 'string') {
      resolveConfig.modules = [...resolveConfig.modules, resolveConfig.root];
    }

    if (Array.isArray(resolveConfig.root)) {
      resolveConfig.modules = [...resolveConfig.modules, ...resolveConfig.root];
    }

    // https://webpack.js.org/configuration/resolve/#resolveroots
    if (Array.isArray(resolveConfig.roots)) {
      resolveConfig.modules = [...resolveConfig.modules, ...resolveConfig.roots];
    }

    if (resolveConfig.modulesDirectories) {
      resolveConfig.modules = [
        ...resolveConfig.modules,
        ...resolveConfig.modulesDirectories
      ];
    }
  }

  try {
    const resolver = webpackResolve.create.sync(resolveConfig);

    // We don't care about what the loader resolves the dependency to
    // we only wnat the path of the resolved file
    dependency = stripLoader(dependency);

    const lookupPath = isRelativePath(dependency) ?
      path.dirname(filename) :
      directory;

    return resolver(lookupPath, dependency);
  } catch (error) {
    debug(`error when resolving ${dependency}`);
    debug(error.message);
    debug(error.stack);
    return '';
  }
}

function stripLoader(dependency) {
  const exclamationLocation = dependency.indexOf('!');

  if (exclamationLocation === -1) return dependency;

  return dependency.slice(exclamationLocation + 1);
}

// Source: https://github.com/mrjoelkemp/is-relative-path/blob/v1.0.2/index.js
/**
 * @param  {String}  filename
 * @return {Boolean}
 */
function isRelativePath(filename) {
  if (typeof filename !== 'string') {
    throw new TypeError(`Path must be a string. Received ${filename}`);
  }

  return filename[0] === '.';
}
