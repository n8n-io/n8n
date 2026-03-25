'use strict';

const {Transform} = require('stream');
const {next} = require('./asFun');
const {sanitize} = require('../index');

const comp = (...fns) => {
  fns = fns.filter(fn => fn);
  return fns.length
    ? new Transform({
        writableObjectMode: true,
        readableObjectMode: true,
        transform(chunk, encoding, callback) {
          next(chunk, fns, 0, value => sanitize(value, this)).then(() => callback(null), error => callback(error));
        }
      })
    : null;
};

module.exports = comp;
