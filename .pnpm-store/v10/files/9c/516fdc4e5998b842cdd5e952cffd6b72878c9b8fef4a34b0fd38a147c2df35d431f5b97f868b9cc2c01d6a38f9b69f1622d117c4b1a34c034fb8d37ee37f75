const path = require('path');
const replaceRootDirInOutput = require('./getOptions').replaceRootDirInOutput;

module.exports = (options, rootDir = null) => {
  const testSuitePropertiesPath = replaceRootDirInOutput(
    rootDir,
    path.join(
      options.testSuitePropertiesDirectory,
      options.testSuitePropertiesFile,
    ),
  );

  return path.isAbsolute(testSuitePropertiesPath)
    ? testSuitePropertiesPath
    : path.resolve(testSuitePropertiesPath);
};
