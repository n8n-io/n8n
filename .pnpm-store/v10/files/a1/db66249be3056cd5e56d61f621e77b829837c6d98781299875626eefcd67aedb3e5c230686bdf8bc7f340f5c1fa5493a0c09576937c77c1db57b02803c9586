#!/usr/bin/env node

'use strict';

const fs = require('fs');
const process = require('process');
const getDependencies = require('../index.js');

const filename = process.argv[2];

if (filename) {
  const deps = getDependencies(fs.readFileSync(filename));
  for (const dep of deps) {
    console.log(dep);
  }
} else {
  console.log('Filename not supplied');
  console.log('Usage: detective-amd <filename>');
}
