'use strict';

const path = require('path');
const fs = require('fs');
const { v1: uuid } = require('uuid');

const constants = require('../constants/index');

const { replaceRootDirInPath } = require('./replaceRootDirInPath');

function getEnvOptions() {
  const options = {};

  for (let name in constants.ENVIRONMENT_CONFIG_MAP) {
    if (process.env[name]) {
      options[constants.ENVIRONMENT_CONFIG_MAP[name]] = process.env[name];
    }
  }

  return options;
}

function getAppOptions(pathToResolve) {
  let traversing = true;

  // Get the root dir to detect when we reached the end to our search
  const rootDir = path.parse(pathToResolve).root

  // Find nearest package.json by traversing up directories until root
  while(traversing) {
    traversing = pathToResolve !== rootDir;

    const pkgpath = path.join(pathToResolve, 'package.json');

    if (fs.existsSync(pkgpath)) {
      let options;

      try {
        options = (require(pkgpath) || {})['jest-junit'];
      } catch (error) {
        console.warn(`Unable to import package.json to get app Options : ${error}`)
      }

      if (Object.prototype.toString.call(options) !== '[object Object]') {
        options = {};
      }

      return options;
    } else {
      pathToResolve = path.dirname(pathToResolve);
    }
  }

  return {};
}

function replaceRootDirInOutput(rootDir, output) {
  return rootDir !== null ? replaceRootDirInPath(rootDir, output) : output;
}

function getUniqueOutputName(outputName) {
  const outputPrefix = outputName ? outputName : 'junit'
  return `${outputPrefix}-${uuid()}.xml`
}

module.exports = {
  options: (reporterOptions = {}) => {
    return Object.assign({}, constants.DEFAULT_OPTIONS, reporterOptions, getAppOptions(process.cwd()), getEnvOptions());
  },
  getAppOptions: getAppOptions,
  getEnvOptions: getEnvOptions,
  replaceRootDirInOutput: replaceRootDirInOutput,
  getUniqueOutputName: getUniqueOutputName
};
