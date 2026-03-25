'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = resolveConfigPath;
function path() {
  const data = _interopRequireWildcard(require('path'));
  path = function () {
    return data;
  };
  return data;
}
function _chalk() {
  const data = _interopRequireDefault(require('chalk'));
  _chalk = function () {
    return data;
  };
  return data;
}
function fs() {
  const data = _interopRequireWildcard(require('graceful-fs'));
  fs = function () {
    return data;
  };
  return data;
}
function _slash() {
  const data = _interopRequireDefault(require('slash'));
  _slash = function () {
    return data;
  };
  return data;
}
function _jestValidate() {
  const data = require('jest-validate');
  _jestValidate = function () {
    return data;
  };
  return data;
}
var _constants = require('./constants');
var _utils = require('./utils');
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
function _getRequireWildcardCache(nodeInterop) {
  if (typeof WeakMap !== 'function') return null;
  var cacheBabelInterop = new WeakMap();
  var cacheNodeInterop = new WeakMap();
  return (_getRequireWildcardCache = function (nodeInterop) {
    return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
  })(nodeInterop);
}
function _interopRequireWildcard(obj, nodeInterop) {
  if (!nodeInterop && obj && obj.__esModule) {
    return obj;
  }
  if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
    return {default: obj};
  }
  var cache = _getRequireWildcardCache(nodeInterop);
  if (cache && cache.has(obj)) {
    return cache.get(obj);
  }
  var newObj = {};
  var hasPropertyDescriptor =
    Object.defineProperty && Object.getOwnPropertyDescriptor;
  for (var key in obj) {
    if (key !== 'default' && Object.prototype.hasOwnProperty.call(obj, key)) {
      var desc = hasPropertyDescriptor
        ? Object.getOwnPropertyDescriptor(obj, key)
        : null;
      if (desc && (desc.get || desc.set)) {
        Object.defineProperty(newObj, key, desc);
      } else {
        newObj[key] = obj[key];
      }
    }
  }
  newObj.default = obj;
  if (cache) {
    cache.set(obj, newObj);
  }
  return newObj;
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const isFile = filePath =>
  fs().existsSync(filePath) && !fs().lstatSync(filePath).isDirectory();
const getConfigFilename = ext => _constants.JEST_CONFIG_BASE_NAME + ext;
function resolveConfigPath(
  pathToResolve,
  cwd,
  skipMultipleConfigError = false
) {
  if (!path().isAbsolute(cwd)) {
    throw new Error(`"cwd" must be an absolute path. cwd: ${cwd}`);
  }
  const absolutePath = path().isAbsolute(pathToResolve)
    ? pathToResolve
    : path().resolve(cwd, pathToResolve);
  if (isFile(absolutePath)) {
    return absolutePath;
  }

  // This is a guard against passing non existing path as a project/config,
  // that will otherwise result in a very confusing situation.
  // e.g.
  // With a directory structure like this:
  //   my_project/
  //     package.json
  //
  // Passing a `my_project/some_directory_that_doesnt_exist` as a project
  // name will resolve into a (possibly empty) `my_project/package.json` and
  // try to run all tests it finds under `my_project` directory.
  if (!fs().existsSync(absolutePath)) {
    throw new Error(
      "Can't find a root directory while resolving a config file path.\n" +
        `Provided path to resolve: ${pathToResolve}\n` +
        `cwd: ${cwd}`
    );
  }
  return resolveConfigPathByTraversing(
    absolutePath,
    pathToResolve,
    cwd,
    skipMultipleConfigError
  );
}
const resolveConfigPathByTraversing = (
  pathToResolve,
  initialPath,
  cwd,
  skipMultipleConfigError
) => {
  const configFiles = _constants.JEST_CONFIG_EXT_ORDER.map(ext =>
    path().resolve(pathToResolve, getConfigFilename(ext))
  ).filter(isFile);
  const packageJson = findPackageJson(pathToResolve);
  if (packageJson && hasPackageJsonJestKey(packageJson)) {
    configFiles.push(packageJson);
  }
  if (!skipMultipleConfigError && configFiles.length > 1) {
    throw new (_jestValidate().ValidationError)(
      ...makeMultipleConfigsErrorMessage(configFiles)
    );
  }
  if (configFiles.length > 0 || packageJson) {
    return configFiles[0] ?? packageJson;
  }

  // This is the system root.
  // We tried everything, config is nowhere to be found ¯\_(ツ)_/¯
  if (pathToResolve === path().dirname(pathToResolve)) {
    throw new Error(makeResolutionErrorMessage(initialPath, cwd));
  }

  // go up a level and try it again
  return resolveConfigPathByTraversing(
    path().dirname(pathToResolve),
    initialPath,
    cwd,
    skipMultipleConfigError
  );
};
const findPackageJson = pathToResolve => {
  const packagePath = path().resolve(pathToResolve, _constants.PACKAGE_JSON);
  if (isFile(packagePath)) {
    return packagePath;
  }
  return undefined;
};
const hasPackageJsonJestKey = packagePath => {
  const content = fs().readFileSync(packagePath, 'utf8');
  try {
    return 'jest' in JSON.parse(content);
  } catch {
    // If package is not a valid JSON
    return false;
  }
};
const makeResolutionErrorMessage = (initialPath, cwd) =>
  'Could not find a config file based on provided values:\n' +
  `path: "${initialPath}"\n` +
  `cwd: "${cwd}"\n` +
  'Config paths must be specified by either a direct path to a config\n' +
  'file, or a path to a directory. If directory is given, Jest will try to\n' +
  `traverse directory tree up, until it finds one of those files in exact order: ${_constants.JEST_CONFIG_EXT_ORDER.map(
    ext => `"${getConfigFilename(ext)}"`
  ).join(' or ')}.`;
function extraIfPackageJson(configPath) {
  if (configPath.endsWith(_constants.PACKAGE_JSON)) {
    return '`jest` key in ';
  }
  return '';
}
const makeMultipleConfigsErrorMessage = configPaths => [
  `${_utils.BULLET}${_chalk().default.bold('Multiple configurations found')}`,
  [
    ...configPaths.map(
      configPath =>
        `    * ${extraIfPackageJson(configPath)}${(0, _slash().default)(
          configPath
        )}`
    ),
    '',
    '  Implicit config resolution does not allow multiple configuration files.',
    '  Either remove unused config files or select one explicitly with `--config`.'
  ].join('\n'),
  _utils.DOCUMENTATION_NOTE
];
