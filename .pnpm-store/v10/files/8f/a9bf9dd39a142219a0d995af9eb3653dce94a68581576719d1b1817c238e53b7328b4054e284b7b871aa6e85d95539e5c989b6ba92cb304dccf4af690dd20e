"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _fs = _interopRequireDefault(require("fs"));
var _path = _interopRequireDefault(require("path"));
const includeRegexp = /<mj-include[^<>]+path=['"](.*(?:\.mjml|\.css|\.html))['"]\s*[^<>]*(\/>|>\s*<\/mj-include>)/gi;
const ensureIncludeIsSupportedFile = file => _path.default.extname(file).match(/\.mjml|\.css|\.html/) ? file : `${file}.mjml`;
const error = e => console.error(e.stack || e); // eslint-disable-line no-console
var _default = (baseFile, filePath) => {
  const filesIncluded = [];
  let filePathDirectory = '';
  if (filePath) {
    try {
      const isFilePathDir = _fs.default.lstatSync(filePath).isDirectory();
      filePathDirectory = isFilePathDir ? filePath : _path.default.dirname(filePath);
    } catch (e) {
      if (e.code === 'ENOENT') {
        throw new Error('Specified filePath does not exist');
      } else {
        throw e;
      }
    }
  }
  const readIncludes = (dir, file, base) => {
    const currentFile = _path.default.resolve(dir ? _path.default.join(dir, ensureIncludeIsSupportedFile(file)) : ensureIncludeIsSupportedFile(file));
    const currentDirectory = _path.default.dirname(currentFile);
    const includes = new RegExp(includeRegexp);
    let content;
    try {
      content = _fs.default.readFileSync(currentFile, 'utf8');
    } catch (e) {
      error(`File not found ${currentFile} from ${base}`);
      return;
    }
    let matchgroup = includes.exec(content);
    while (matchgroup != null) {
      const includedFile = ensureIncludeIsSupportedFile(matchgroup[1]);

      // when reading first level of includes we must join the path specified in filePath
      // when reading further nested includes, just take parent dir as base
      const targetDir = filePath && file === baseFile ? filePathDirectory : currentDirectory;
      const includedFilePath = _path.default.resolve(_path.default.join(targetDir, includedFile));
      filesIncluded.push(includedFilePath);
      readIncludes(targetDir, includedFile, currentFile);
      matchgroup = includes.exec(content);
    }
  };
  readIncludes(null, baseFile, baseFile);
  return filesIncluded;
};
exports.default = _default;
module.exports = exports.default;