#!/usr/bin/env node
const nopt = require('../lib/nopt')
const path = require('path')
console.log('parsed', nopt({
  num: Number,
  bool: Boolean,
  help: Boolean,
  list: Array,
  'num-list': [Number, Array],
  'str-list': [String, Array],
  'bool-list': [Boolean, Array],
  str: String,
  clear: Boolean,
  config: Boolean,
  length: Number,
  file: path,
}, {
  s: ['--str', 'astring'],
  b: ['--bool'],
  nb: ['--no-bool'],
  tft: ['--bool-list', '--no-bool-list', '--bool-list', 'true'],
  '?': ['--help'],
  h: ['--help'],
  H: ['--help'],
  n: ['--num', '125'],
  c: ['--config'],
  l: ['--length'],
  f: ['--file'],
}, process.argv, 2))
