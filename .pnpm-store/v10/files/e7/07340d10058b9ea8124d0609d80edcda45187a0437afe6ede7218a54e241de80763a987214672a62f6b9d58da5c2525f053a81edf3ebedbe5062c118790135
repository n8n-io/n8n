'use strict';

const { Session } = require('inspector');
const { promisify } = require('util');

class CoverageInstrumenter {
  constructor() {
    this.session = new Session();

    this.postSession = promisify(this.session.post.bind(this.session));
  }

  async startInstrumenting() {
    this.session.connect();

    await this.postSession('Profiler.enable');

    await this.postSession('Profiler.startPreciseCoverage', {
      callCount: true,
      detailed: true,
    });
  }

  async stopInstrumenting() {
    const {result} = await this.postSession(
      'Profiler.takePreciseCoverage',
    );

    await this.postSession('Profiler.stopPreciseCoverage');

    await this.postSession('Profiler.disable');

    // When using networked filesystems on Windows, v8 sometimes returns URLs
    // of the form file:////<host>/path. These URLs are not well understood
    // by NodeJS (see https://github.com/nodejs/node/issues/48530).
    // We circumvent this issue here by fixing these URLs.
    // FWIW, Python has special code to deal with URLs like this
    // https://github.com/python/cpython/blob/bef1c8761e3b0dfc5708747bb646ad8b669cbd67/Lib/nturl2path.py#L22C1-L22C1
    if (process.platform === 'win32') {
      const prefix = 'file:////';
      result.forEach(res => {
        if (res.url.startsWith(prefix)) {
          res.url = 'file://' + res.url.slice(prefix.length);
        }
      })
    }

    return result;
  }
}

module.exports.CoverageInstrumenter = CoverageInstrumenter;
