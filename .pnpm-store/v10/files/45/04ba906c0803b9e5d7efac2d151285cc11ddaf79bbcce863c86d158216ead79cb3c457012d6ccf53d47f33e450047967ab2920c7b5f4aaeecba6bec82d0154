"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
const stdinSync = () => new Promise(res => {
  let buffer = '';
  const stream = process.stdin;
  stream.on('data', chunck => {
    buffer += chunck;
  });
  stream.on('end', () => res(buffer));
});
var _default = async () => {
  const mjml = await stdinSync();
  return {
    mjml
  };
};
exports.default = _default;
module.exports = exports.default;