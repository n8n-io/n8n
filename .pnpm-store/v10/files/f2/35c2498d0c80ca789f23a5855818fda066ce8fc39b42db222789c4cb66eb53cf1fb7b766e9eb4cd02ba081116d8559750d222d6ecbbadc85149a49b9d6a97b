'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var path = require('path');
var builtinList = _interopDefault(require('builtin-modules'));
var deepMerge = _interopDefault(require('deepmerge'));
var isModule = _interopDefault(require('is-module'));
var fs = require('fs');
var fs__default = _interopDefault(fs);
var util = require('util');
var pluginutils = require('@rollup/pluginutils');
var resolveModule = _interopDefault(require('resolve'));

const exists = util.promisify(fs__default.exists);
const readFile = util.promisify(fs__default.readFile);
const realpath = util.promisify(fs__default.realpath);
const stat = util.promisify(fs__default.stat);

const onError = (error) => {
  if (error.code === 'ENOENT') {
    return false;
  }
  throw error;
};

const makeCache = (fn) => {
  const cache = new Map();
  const wrapped = async (param, done) => {
    if (cache.has(param) === false) {
      cache.set(
        param,
        fn(param).catch((err) => {
          cache.delete(param);
          throw err;
        })
      );
    }

    try {
      const result = cache.get(param);
      const value = await result;
      return done(null, value);
    } catch (error) {
      return done(error);
    }
  };

  wrapped.clear = () => cache.clear();

  return wrapped;
};

const isDirCached = makeCache(async (file) => {
  try {
    const stats = await stat(file);
    return stats.isDirectory();
  } catch (error) {
    return onError(error);
  }
});

const isFileCached = makeCache(async (file) => {
  try {
    const stats = await stat(file);
    return stats.isFile();
  } catch (error) {
    return onError(error);
  }
});

const readCachedFile = makeCache(readFile);

const resolveId = util.promisify(resolveModule);

// returns the imported package name for bare module imports
function getPackageName(id) {
  if (id.startsWith('.') || id.startsWith('/')) {
    return null;
  }

  const split = id.split('/');

  // @my-scope/my-package/foo.js -> @my-scope/my-package
  // @my-scope/my-package -> @my-scope/my-package
  if (split[0][0] === '@') {
    return `${split[0]}/${split[1]}`;
  }

  // my-package/foo.js -> my-package
  // my-package -> my-package
  return split[0];
}

function getMainFields(options) {
  let mainFields;
  if (options.mainFields) {
    ({ mainFields } = options);
  } else {
    mainFields = ['module', 'main'];
  }
  if (options.browser && mainFields.indexOf('browser') === -1) {
    return ['browser'].concat(mainFields);
  }
  if (!mainFields.length) {
    throw new Error('Please ensure at least one `mainFields` value is specified');
  }
  return mainFields;
}

function getPackageInfo(options) {
  const { cache, extensions, pkg, mainFields, preserveSymlinks, useBrowserOverrides } = options;
  let { pkgPath } = options;

  if (cache.has(pkgPath)) {
    return cache.get(pkgPath);
  }

  // browserify/resolve doesn't realpath paths returned in its packageFilter callback
  if (!preserveSymlinks) {
    pkgPath = fs.realpathSync(pkgPath);
  }

  const pkgRoot = path.dirname(pkgPath);

  const packageInfo = {
    // copy as we are about to munge the `main` field of `pkg`.
    packageJson: Object.assign({}, pkg),

    // path to package.json file
    packageJsonPath: pkgPath,

    // directory containing the package.json
    root: pkgRoot,

    // which main field was used during resolution of this module (main, module, or browser)
    resolvedMainField: 'main',

    // whether the browser map was used to resolve the entry point to this module
    browserMappedMain: false,

    // the entry point of the module with respect to the selected main field and any
    // relevant browser mappings.
    resolvedEntryPoint: ''
  };

  let overriddenMain = false;
  for (let i = 0; i < mainFields.length; i++) {
    const field = mainFields[i];
    if (typeof pkg[field] === 'string') {
      pkg.main = pkg[field];
      packageInfo.resolvedMainField = field;
      overriddenMain = true;
      break;
    }
  }

  const internalPackageInfo = {
    cachedPkg: pkg,
    hasModuleSideEffects: () => null,
    hasPackageEntry: overriddenMain !== false || mainFields.indexOf('main') !== -1,
    packageBrowserField:
      useBrowserOverrides &&
      typeof pkg.browser === 'object' &&
      Object.keys(pkg.browser).reduce((browser, key) => {
        let resolved = pkg.browser[key];
        if (resolved && resolved[0] === '.') {
          resolved = path.resolve(pkgRoot, resolved);
        }
        /* eslint-disable no-param-reassign */
        browser[key] = resolved;
        if (key[0] === '.') {
          const absoluteKey = path.resolve(pkgRoot, key);
          browser[absoluteKey] = resolved;
          if (!path.extname(key)) {
            extensions.reduce((subBrowser, ext) => {
              subBrowser[absoluteKey + ext] = subBrowser[key];
              return subBrowser;
            }, browser);
          }
        }
        return browser;
      }, {}),
    packageInfo
  };

  const browserMap = internalPackageInfo.packageBrowserField;
  if (
    useBrowserOverrides &&
    typeof pkg.browser === 'object' &&
    // eslint-disable-next-line no-prototype-builtins
    browserMap.hasOwnProperty(pkg.main)
  ) {
    packageInfo.resolvedEntryPoint = browserMap[pkg.main];
    packageInfo.browserMappedMain = true;
  } else {
    // index.node is technically a valid default entrypoint as well...
    packageInfo.resolvedEntryPoint = path.resolve(pkgRoot, pkg.main || 'index.js');
    packageInfo.browserMappedMain = false;
  }

  const packageSideEffects = pkg.sideEffects;
  if (typeof packageSideEffects === 'boolean') {
    internalPackageInfo.hasModuleSideEffects = () => packageSideEffects;
  } else if (Array.isArray(packageSideEffects)) {
    internalPackageInfo.hasModuleSideEffects = pluginutils.createFilter(packageSideEffects, null, {
      resolve: pkgRoot
    });
  }

  cache.set(pkgPath, internalPackageInfo);
  return internalPackageInfo;
}

function normalizeInput(input) {
  if (Array.isArray(input)) {
    return input;
  } else if (typeof input === 'object') {
    return Object.values(input);
  }

  // otherwise it's a string
  return [input];
}

// Resolve module specifiers in order. Promise resolves to the first module that resolves
// successfully, or the error that resulted from the last attempted module resolution.
function resolveImportSpecifiers(importSpecifierList, resolveOptions) {
  let promise = Promise.resolve();

  for (let i = 0; i < importSpecifierList.length; i++) {
    promise = promise.then((value) => {
      // if we've already resolved to something, just return it.
      if (value) {
        return value;
      }

      return resolveId(importSpecifierList[i], resolveOptions).then((result) => {
        if (!resolveOptions.preserveSymlinks) {
          result = fs.realpathSync(result);
        }
        return result;
      });
    });

    if (i < importSpecifierList.length - 1) {
      // swallow MODULE_NOT_FOUND errors from all but the last resolution
      promise = promise.catch((error) => {
        if (error.code !== 'MODULE_NOT_FOUND') {
          throw error;
        }
      });
    }
  }

  return promise;
}

/* eslint-disable no-param-reassign, no-shadow, no-undefined */

const builtins = new Set(builtinList);
const ES6_BROWSER_EMPTY = '\0node-resolve:empty.js';
const nullFn = () => null;
const deepFreeze = (object) => {
  Object.freeze(object);

  for (const value of Object.values(object)) {
    if (typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }

  return object;
};
const defaults = {
  customResolveOptions: {},
  dedupe: [],
  // It's important that .mjs is listed before .js so that Rollup will interpret npm modules
  // which deploy both ESM .mjs and CommonJS .js files as ESM.
  extensions: ['.mjs', '.js', '.json', '.node'],
  resolveOnly: []
};
const DEFAULTS = deepFreeze(deepMerge({}, defaults));

function nodeResolve(opts = {}) {
  const options = Object.assign({}, defaults, opts);
  const { customResolveOptions, extensions, jail } = options;
  const warnings = [];
  const packageInfoCache = new Map();
  const idToPackageInfo = new Map();
  const mainFields = getMainFields(options);
  const useBrowserOverrides = mainFields.indexOf('browser') !== -1;
  const isPreferBuiltinsSet = options.preferBuiltins === true || options.preferBuiltins === false;
  const preferBuiltins = isPreferBuiltinsSet ? options.preferBuiltins : true;
  const rootDir = options.rootDir || process.cwd();
  let { dedupe } = options;
  let rollupOptions;

  if (options.only) {
    warnings.push('node-resolve: The `only` options is deprecated, please use `resolveOnly`');
    options.resolveOnly = options.only;
  }

  if (typeof dedupe !== 'function') {
    dedupe = (importee) =>
      options.dedupe.includes(importee) || options.dedupe.includes(getPackageName(importee));
  }

  const resolveOnly = options.resolveOnly.map((pattern) => {
    if (pattern instanceof RegExp) {
      return pattern;
    }
    const normalized = pattern.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&');
    return new RegExp(`^${normalized}$`);
  });

  const browserMapCache = new Map();
  let preserveSymlinks;

  return {
    name: 'node-resolve',

    buildStart(options) {
      rollupOptions = options;

      for (const warning of warnings) {
        this.warn(warning);
      }

      ({ preserveSymlinks } = options);
    },

    generateBundle() {
      readCachedFile.clear();
      isFileCached.clear();
      isDirCached.clear();
    },

    async resolveId(importee, importer) {
      if (importee === ES6_BROWSER_EMPTY) {
        return importee;
      }
      // ignore IDs with null character, these belong to other plugins
      if (/\0/.test(importee)) return null;

      // strip hash and query params from import
      const [withoutHash, hash] = importee.split('#');
      const [importPath, params] = withoutHash.split('?');
      const importSuffix = `${params ? `?${params}` : ''}${hash ? `#${hash}` : ''}`;
      importee = importPath;

      const basedir = !importer || dedupe(importee) ? rootDir : path.dirname(importer);

      // https://github.com/defunctzombie/package-browser-field-spec
      const browser = browserMapCache.get(importer);
      if (useBrowserOverrides && browser) {
        const resolvedImportee = path.resolve(basedir, importee);
        if (browser[importee] === false || browser[resolvedImportee] === false) {
          return ES6_BROWSER_EMPTY;
        }
        const browserImportee =
          browser[importee] ||
          browser[resolvedImportee] ||
          browser[`${resolvedImportee}.js`] ||
          browser[`${resolvedImportee}.json`];
        if (browserImportee) {
          importee = browserImportee;
        }
      }

      const parts = importee.split(/[/\\]/);
      let id = parts.shift();
      let isRelativeImport = false;

      if (id[0] === '@' && parts.length > 0) {
        // scoped packages
        id += `/${parts.shift()}`;
      } else if (id[0] === '.') {
        // an import relative to the parent dir of the importer
        id = path.resolve(basedir, importee);
        isRelativeImport = true;
      }

      if (
        !isRelativeImport &&
        resolveOnly.length &&
        !resolveOnly.some((pattern) => pattern.test(id))
      ) {
        if (normalizeInput(rollupOptions.input).includes(importee)) {
          return null;
        }
        return false;
      }

      let hasModuleSideEffects = nullFn;
      let hasPackageEntry = true;
      let packageBrowserField = false;
      let packageInfo;

      const filter = (pkg, pkgPath) => {
        const info = getPackageInfo({
          cache: packageInfoCache,
          extensions,
          pkg,
          pkgPath,
          mainFields,
          preserveSymlinks,
          useBrowserOverrides
        });

        ({ packageInfo, hasModuleSideEffects, hasPackageEntry, packageBrowserField } = info);

        return info.cachedPkg;
      };

      let resolveOptions = {
        basedir,
        packageFilter: filter,
        readFile: readCachedFile,
        isFile: isFileCached,
        isDirectory: isDirCached,
        extensions
      };

      if (preserveSymlinks !== undefined) {
        resolveOptions.preserveSymlinks = preserveSymlinks;
      }

      const importSpecifierList = [];

      if (importer === undefined && !importee[0].match(/^\.?\.?\//)) {
        // For module graph roots (i.e. when importer is undefined), we
        // need to handle 'path fragments` like `foo/bar` that are commonly
        // found in rollup config files. If importee doesn't look like a
        // relative or absolute path, we make it relative and attempt to
        // resolve it. If we don't find anything, we try resolving it as we
        // got it.
        importSpecifierList.push(`./${importee}`);
      }

      const importeeIsBuiltin = builtins.has(importee);

      if (importeeIsBuiltin && (!preferBuiltins || !isPreferBuiltinsSet)) {
        // The `resolve` library will not resolve packages with the same
        // name as a node built-in module. If we're resolving something
        // that's a builtin, and we don't prefer to find built-ins, we
        // first try to look up a local module with that name. If we don't
        // find anything, we resolve the builtin which just returns back
        // the built-in's name.
        importSpecifierList.push(`${importee}/`);
      }

      // TypeScript files may import '.js' to refer to either '.ts' or '.tsx'
      if (importer && importee.endsWith('.js')) {
        for (const ext of ['.ts', '.tsx']) {
          if (importer.endsWith(ext) && extensions.includes(ext)) {
            importSpecifierList.push(importee.replace(/.js$/, ext));
          }
        }
      }

      importSpecifierList.push(importee);
      resolveOptions = Object.assign(resolveOptions, customResolveOptions);

      try {
        let resolved = await resolveImportSpecifiers(importSpecifierList, resolveOptions);

        if (resolved && packageBrowserField) {
          if (Object.prototype.hasOwnProperty.call(packageBrowserField, resolved)) {
            if (!packageBrowserField[resolved]) {
              browserMapCache.set(resolved, packageBrowserField);
              return ES6_BROWSER_EMPTY;
            }
            resolved = packageBrowserField[resolved];
          }
          browserMapCache.set(resolved, packageBrowserField);
        }

        if (hasPackageEntry && !preserveSymlinks && resolved) {
          const fileExists = await exists(resolved);
          if (fileExists) {
            resolved = await realpath(resolved);
          }
        }

        idToPackageInfo.set(resolved, packageInfo);

        if (hasPackageEntry) {
          if (builtins.has(resolved) && preferBuiltins && isPreferBuiltinsSet) {
            return null;
          } else if (importeeIsBuiltin && preferBuiltins) {
            if (!isPreferBuiltinsSet) {
              this.warn(
                `preferring built-in module '${importee}' over local alternative at '${resolved}', pass 'preferBuiltins: false' to disable this behavior or 'preferBuiltins: true' to disable this warning`
              );
            }
            return null;
          } else if (jail && resolved.indexOf(path.normalize(jail.trim(path.sep))) !== 0) {
            return null;
          }
        }

        if (resolved && options.modulesOnly) {
          const code = await readFile(resolved, 'utf-8');
          if (isModule(code)) {
            return {
              id: `${resolved}${importSuffix}`,
              moduleSideEffects: hasModuleSideEffects(resolved)
            };
          }
          return null;
        }
        const result = {
          id: `${resolved}${importSuffix}`,
          moduleSideEffects: hasModuleSideEffects(resolved)
        };
        return result;
      } catch (error) {
        return null;
      }
    },

    load(importee) {
      if (importee === ES6_BROWSER_EMPTY) {
        return 'export default {};';
      }
      return null;
    },

    getPackageInfoForId(id) {
      return idToPackageInfo.get(id);
    }
  };
}

exports.DEFAULTS = DEFAULTS;
exports.default = nodeResolve;
exports.nodeResolve = nodeResolve;
