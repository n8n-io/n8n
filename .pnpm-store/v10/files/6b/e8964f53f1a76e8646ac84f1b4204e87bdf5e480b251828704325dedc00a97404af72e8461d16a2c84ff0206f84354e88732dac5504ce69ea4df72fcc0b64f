"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _default = ({
  compiled: {
    html
  },
  file
}, addFileHeaderComment) => new Promise(resolve => {
  let output = '';
  if (addFileHeaderComment) {
    output = `<!-- FILE: ${file} -->\n`;
  }
  output += `${html}\n`;
  process.stdout.write(output, resolve);
});
exports.default = _default;
module.exports = exports.default;