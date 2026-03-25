'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = init;
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
function _prompts() {
  const data = _interopRequireDefault(require('prompts'));
  _prompts = function () {
    return data;
  };
  return data;
}
function _jestConfig() {
  const data = require('jest-config');
  _jestConfig = function () {
    return data;
  };
  return data;
}
function _jestUtil() {
  const data = require('jest-util');
  _jestUtil = function () {
    return data;
  };
  return data;
}
var _errors = require('./errors');
var _generateConfigFile = _interopRequireDefault(
  require('./generateConfigFile')
);
var _modifyPackageJson = _interopRequireDefault(require('./modifyPackageJson'));
var _questions = _interopRequireWildcard(require('./questions'));
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

const {
  JEST_CONFIG_BASE_NAME,
  JEST_CONFIG_EXT_MJS,
  JEST_CONFIG_EXT_JS,
  JEST_CONFIG_EXT_TS,
  JEST_CONFIG_EXT_ORDER,
  PACKAGE_JSON
} = _jestConfig().constants;
const getConfigFilename = ext => JEST_CONFIG_BASE_NAME + ext;
async function init(rootDir = (0, _jestUtil().tryRealpath)(process.cwd())) {
  // prerequisite checks
  const projectPackageJsonPath = path().join(rootDir, PACKAGE_JSON);
  if (!fs().existsSync(projectPackageJsonPath)) {
    throw new _errors.NotFoundPackageJsonError(rootDir);
  }
  const questions = _questions.default.slice(0);
  let hasJestProperty = false;
  let projectPackageJson;
  try {
    projectPackageJson = JSON.parse(
      fs().readFileSync(projectPackageJsonPath, 'utf-8')
    );
  } catch {
    throw new _errors.MalformedPackageJsonError(projectPackageJsonPath);
  }
  if (projectPackageJson.jest) {
    hasJestProperty = true;
  }
  const existingJestConfigExt = JEST_CONFIG_EXT_ORDER.find(ext =>
    fs().existsSync(path().join(rootDir, getConfigFilename(ext)))
  );
  if (hasJestProperty || existingJestConfigExt) {
    const result = await (0, _prompts().default)({
      initial: true,
      message:
        'It seems that you already have a jest configuration, do you want to override it?',
      name: 'continue',
      type: 'confirm'
    });
    if (!result.continue) {
      console.log();
      console.log('Aborting...');
      return;
    }
  }

  // Add test script installation only if needed
  if (
    !projectPackageJson.scripts ||
    projectPackageJson.scripts.test !== 'jest'
  ) {
    questions.unshift(_questions.testScriptQuestion);
  }

  // Start the init process
  console.log();
  console.log(
    _chalk().default.underline(
      'The following questions will help Jest to create a suitable configuration for your project\n'
    )
  );
  let promptAborted = false;
  const results = await (0, _prompts().default)(questions, {
    onCancel: () => {
      promptAborted = true;
    }
  });
  if (promptAborted) {
    console.log();
    console.log('Aborting...');
    return;
  }

  // Determine if Jest should use JS or TS for the config file
  const jestConfigFileExt = results.useTypescript
    ? JEST_CONFIG_EXT_TS
    : projectPackageJson.type === 'module'
    ? JEST_CONFIG_EXT_MJS
    : JEST_CONFIG_EXT_JS;

  // Determine Jest config path
  const jestConfigPath = existingJestConfigExt
    ? getConfigFilename(existingJestConfigExt)
    : path().join(rootDir, getConfigFilename(jestConfigFileExt));
  const shouldModifyScripts = results.scripts;
  if (shouldModifyScripts || hasJestProperty) {
    const modifiedPackageJson = (0, _modifyPackageJson.default)({
      projectPackageJson,
      shouldModifyScripts
    });
    fs().writeFileSync(projectPackageJsonPath, modifiedPackageJson);
    console.log('');
    console.log(
      `✏️  Modified ${_chalk().default.cyan(projectPackageJsonPath)}`
    );
  }
  const generatedConfig = (0, _generateConfigFile.default)(
    results,
    projectPackageJson.type === 'module' ||
      jestConfigPath.endsWith(JEST_CONFIG_EXT_MJS)
  );
  fs().writeFileSync(jestConfigPath, generatedConfig);
  console.log('');
  console.log(
    `📝  Configuration file created at ${_chalk().default.cyan(jestConfigPath)}`
  );
}
