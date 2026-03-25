"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isDirectory = exports.default = void 0;
var _fs = _interopRequireDefault(require("fs"));
var _path = _interopRequireDefault(require("path"));
const isDirectory = file => {
  try {
    const outputPath = _path.default.resolve(process.cwd(), file);
    return _fs.default.statSync(outputPath).isDirectory();
  } catch (e) {
    return false;
  }
};
exports.isDirectory = isDirectory;
const replaceExtension = input => input.replace('.mjml', input.replace('.mjml', '').match(/(.)*\.(.)+$/g) ? '' : '.html');
const stripPath = input => input.match(/[^/\\]+$/g)[0];
const makeGuessOutputName = outputPath => {
  if (isDirectory(outputPath)) {
    return input => _path.default.join(outputPath, replaceExtension(stripPath(input)));
  }
  return input => {
    if (!outputPath) {
      return replaceExtension(stripPath(input));
    }
    return outputPath;
  };
};
var _default = outputPath => {
  const guessOutputName = makeGuessOutputName(outputPath);
  return ({
    file,
    compiled: {
      html
    }
  }) => new Promise((resolve, reject) => {
    const outputName = guessOutputName(file);
    _fs.default.writeFile(outputName, html, err => {
      if (err) {
        // eslint-disable-next-line prefer-promise-reject-errors
        return reject({
          outputName,
          err
        });
      }
      return resolve(outputName);
    });
  });
};
exports.default = _default;