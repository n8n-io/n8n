#!/usr/bin/env node

'use strict';

const { program } = require('commander');
const lookup = require('../index.js');
const { name, description, version } = require('../package.json');

program
  .name(name)
  .description(description)
  .version(version)
  .argument('<path>', 'the path to partial/dependency to examine')
  .usage('[options] <path>')
  .option('-f, --filename [path]', 'file containing the dependency')
  .option('-d, --directory [path]', 'location of all sass files')
  .showHelpAfterError()
  .parse();

const dependency = program.args[0];
const { filename, directory } = program.opts();

console.log(lookup(dependency, filename, directory));
