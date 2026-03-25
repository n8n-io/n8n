'use strict';

const format = require('util').format;

module.exports = class Logger {
  constructor(stream) {
    this.stream = stream;
  }

  log() {
    const message = format(...arguments);
    this.stream.write(`[sentry-cli] ${message}\n`);
  }
};
