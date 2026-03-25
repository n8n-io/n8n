'use strict';

const Utf8Stream = require('../utils/Utf8Stream');

class JsonlParser extends Utf8Stream {
  static make(options) {
    return new JsonlParser(options);
  }

  static checkedParse(input, reviver, errorIndicator) {
    try {
      return JSON.parse(input, reviver);
    } catch (error) {
      if (typeof errorIndicator == 'function') return errorIndicator(error, input, reviver);
    }
    return errorIndicator;
  }

  constructor(options) {
    super(Object.assign({}, options, {readableObjectMode: true}));
    this._rest = '';
    this._counter = 0;
    this._reviver = options && options.reviver;
    this._errorIndicator = options && options.errorIndicator;
    if (options && options.checkErrors) {
      this._processBuffer = this._checked_processBuffer;
      this._flush = this._checked_flush;
    }
    if (options && 'errorIndicator' in options) {
      this._processBuffer = this._suppressed_processBuffer;
      this._flush = this._suppressed_flush;
    }
  }

  _processBuffer(callback) {
    const lines = this._buffer.split('\n');
    this._rest += lines[0];
    if (lines.length > 1) {
      this._rest && this.push({key: this._counter++, value: JSON.parse(this._rest, this._reviver)});
      this._rest = lines.pop();
      for (let i = 1; i < lines.length; ++i) {
        lines[i] && this.push({key: this._counter++, value: JSON.parse(lines[i], this._reviver)});
      }
    }
    this._buffer = '';
    callback(null);
  }

  _flush(callback) {
    super._flush(error => {
      if (error) return callback(error);
      if (this._rest) {
        this.push({key: this._counter++, value: JSON.parse(this._rest, this._reviver)});
        this._rest = '';
      }
      callback(null);
    });
  }

  _suppressed_processBuffer(callback) {
    const lines = this._buffer.split('\n');
    this._rest += lines[0];
    if (lines.length > 1) {
      if (this._rest) {
        const value = JsonlParser.checkedParse(this._rest, this._reviver, this._errorIndicator);
        value !== undefined && this.push({key: this._counter++, value});
      }
      this._rest = lines.pop();
      for (let i = 1; i < lines.length; ++i) {
        if (!lines[i]) continue;
        const value = JsonlParser.checkedParse(lines[i], this._reviver, this._errorIndicator);
        value !== undefined && this.push({key: this._counter++, value});
      }
    }
    this._buffer = '';
    callback(null);
  }

  _suppressed_flush(callback) {
    super._flush(error => {
      if (error) return callback(error);
      if (this._rest) {
        const value = JsonlParser.checkedParse(this._rest, this._reviver, this._errorIndicator);
        value !== undefined && this.push({key: this._counter++, value});
        this._rest = '';
      }
      callback(null);
    });
  }

  _checked_processBuffer(callback) {
    const lines = this._buffer.split('\n');
    this._rest += lines[0];
    if (lines.length > 1) {
      try {
        this._rest && this.push({key: this._counter++, value: JSON.parse(this._rest, this._reviver)});
        this._rest = lines.pop();
        for (let i = 1; i < lines.length; ++i) {
          lines[i] && this.push({key: this._counter++, value: JSON.parse(lines[i], this._reviver)});
        }
      } catch (cbErr) {
        this._buffer = '';
        callback(cbErr);
        return;
      }
    }
    this._buffer = '';
    callback(null);
  }

  _checked_flush(callback) {
    super._flush(error => {
      if (error) return callback(error);
      if (this._rest) {
        try {
          this.push({key: this._counter++, value: JSON.parse(this._rest, this._reviver)});
        } catch (cbErr) {
          this._rest = '';
          callback(cbErr);
          return;
        }
        this._rest = '';
      }
      callback(null);
    });
  }
}
JsonlParser.parser = JsonlParser.make;
JsonlParser.make.Constructor = JsonlParser;

module.exports = JsonlParser;
