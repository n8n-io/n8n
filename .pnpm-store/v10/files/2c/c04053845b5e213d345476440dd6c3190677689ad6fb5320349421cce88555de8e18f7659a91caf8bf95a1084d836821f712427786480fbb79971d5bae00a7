#!/usr/bin/env node

'use strict';

const { program } = require('commander');
const dependencyTree = require('../index.js');
const { name, description, version } = require('../package.json');

program
  .name(name)
  .description(description)
  .version(version)
  .usage('[options] <filename>')
  .option('-d, --directory <path>', 'location of files of supported filetypes')
  .option('-c, --require-config <path>', 'path to a requirejs config')
  .option('-w, --webpack-config <path>', 'path to a webpack config')
  .option('-t, --ts-config <path>', 'path to a typescript config')
  .option('--list-form', 'output the list form of the tree (one element per line)')
  .parse();

const cliOptions = program.opts();
const options = {
  filename: program.args[0],
  root: cliOptions.directory,
  config: cliOptions.requireConfig,
  webpackConfig: cliOptions.webpackConfig,
  tsConfig: cliOptions.tsConfig
};

let tree;

if (cliOptions.listForm) {
  tree = dependencyTree.toList(options);

  for (const node of tree) {
    console.log(node);
  }
} else {
  tree = dependencyTree(options);

  console.log(JSON.stringify(tree));
}
