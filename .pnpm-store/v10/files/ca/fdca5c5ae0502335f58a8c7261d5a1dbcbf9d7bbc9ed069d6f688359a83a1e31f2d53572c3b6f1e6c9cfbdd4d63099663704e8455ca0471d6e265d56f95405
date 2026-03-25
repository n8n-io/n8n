// Copied from https://github.com/facebook/jest/blob/master/packages/jest-config/src/utils.js
// in order to reduce incompatible jest dependencies

const path = require('path');

module.exports = {
  replaceRootDirInPath : (rootDir,filePath) => {
    if (!/^<rootDir>/.test(filePath)) {
      return filePath;
    }

    return path.resolve(
      rootDir,
      path.normalize('./' + filePath.substr('<rootDir>'.length))
    )
  }
}
