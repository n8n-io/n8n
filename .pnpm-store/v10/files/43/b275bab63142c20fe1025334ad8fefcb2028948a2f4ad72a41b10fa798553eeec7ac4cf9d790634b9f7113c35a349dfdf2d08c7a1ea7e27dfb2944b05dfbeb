'use strict';

const {chain} = require('stream-chain');

const Parser = require('../Parser');

const withParser = (fn, options) =>
  chain([new Parser(options), fn(options)], Object.assign({}, options, {writableObjectMode: false, readableObjectMode: true}));

module.exports = withParser;
