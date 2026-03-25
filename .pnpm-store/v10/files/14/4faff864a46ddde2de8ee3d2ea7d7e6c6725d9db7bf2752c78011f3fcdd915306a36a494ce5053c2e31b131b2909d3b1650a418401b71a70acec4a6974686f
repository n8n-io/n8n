'use strict';

const {Transform} = require('stream');
const {next} = require('./asGen');
const {sanitize} = require('../index');

const gen = (...fns) => {
  fns = fns.filter(fn => fn);
  return fns.length
    ? new Transform({
        writableObjectMode: true,
        readableObjectMode: true,
        transform(chunk, encoding, callback) {
          (async () => {
            for await (let value of next(chunk, fns, 0)) {
              sanitize(value, this);
            }
          })().then(() => callback(null), error => callback(error));
        }
      })
    : null;
};

module.exports = gen;
