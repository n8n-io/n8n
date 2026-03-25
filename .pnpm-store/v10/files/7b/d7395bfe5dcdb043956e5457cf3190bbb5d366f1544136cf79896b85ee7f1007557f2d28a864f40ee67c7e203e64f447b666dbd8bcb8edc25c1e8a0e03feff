#!/usr/bin/env node

'use strict';

const { program } = require('commander');
const cabinet = require('../index.js');
const { name, description, version } = require('../package.json');

program
  .name(name)
  .description(description)
  .version(version)
  .argument('<path>', 'the path to partial/dependency to examine')
  .option('-d, --directory <path>', 'root of all files')
  .option('-c, --config [path]', 'location of a RequireJS config file for AMD')
  .option('-w, --webpack-config [path]', 'location of a Webpack config file')
  .option('-t, --ts-config [path]', 'location of a TypeScript config file')
  .option('-f, --filename [path]', 'file containing the dependency')
  .showHelpAfterError()
  .parse();

const partial = program.args[0];
const { filename, directory, config, webpackConfig, tsConfig } = program.opts();

const result = cabinet({
  partial,
  filename,
  directory,
  config,
  webpackConfig,
  tsConfig
});

console.log(result);
