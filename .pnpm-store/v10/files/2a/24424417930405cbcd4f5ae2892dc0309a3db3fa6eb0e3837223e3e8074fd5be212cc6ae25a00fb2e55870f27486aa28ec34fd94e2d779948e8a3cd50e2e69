#!/usr/bin/env node
"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
var _fs = _interopRequireDefault(require("fs"));
var _yargs = _interopRequireDefault(require("yargs"));
var _migrate = _interopRequireDefault(require("./migrate"));
var _package = require("../package.json");
const program = _yargs.default.usage('$0 [options] <input-file> <output-file>').version(_package.version).help();
if (program.argv._.length !== 2) {
  program.showHelp();
  process.exit(1);
}
const [inputFilename, outputFilename] = program.argv._;
const input = _fs.default.readFileSync(inputFilename, 'utf8');
const output = (0, _migrate.default)(input);
_fs.default.writeFileSync(outputFilename, output);

// eslint-disable-next-line no-console
console.log(`${inputFilename} was converted to the MJML 4 syntax in ${outputFilename}`);