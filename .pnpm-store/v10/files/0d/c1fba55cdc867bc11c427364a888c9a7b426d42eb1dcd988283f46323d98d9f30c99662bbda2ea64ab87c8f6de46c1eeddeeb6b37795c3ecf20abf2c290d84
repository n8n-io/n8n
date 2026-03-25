'use strict';

const {Writable} = require('stream');
const {StringDecoder} = require('string_decoder');

const patterns = {
  value1: /^(?:[\"\{\[\]\-\d]|true\b|false\b|null\b|\s{1,256})/,
  string: /^(?:[^\x00-\x1f\"\\]{1,256}|\\[bfnrt\"\\\/]|\\u[\da-fA-F]{4}|\")/,
  key1: /^(?:[\"\}]|\s{1,256})/,
  colon: /^(?:\:|\s{1,256})/,
  comma: /^(?:[\,\]\}]|\s{1,256})/,
  ws: /^\s{1,256}/,
  numberStart: /^\d/,
  numberDigit: /^\d{0,256}/,
  numberFraction: /^[\.eE]/,
  numberExponent: /^[eE]/,
  numberExpSign: /^[-+]/
};
const MAX_PATTERN_SIZE = 16;

let noSticky = true;
try {
  new RegExp('.', 'y');
  noSticky = false;
} catch (e) {
  // suppress
}

!noSticky &&
  Object.keys(patterns).forEach(key => {
    let src = patterns[key].source.slice(1); // lop off ^
    if (src.slice(0, 3) === '(?:' && src.slice(-1) === ')') {
      src = src.slice(3, -1);
    }
    patterns[key] = new RegExp(src, 'y');
  });

patterns.numberFracStart = patterns.numberExpStart = patterns.numberStart;
patterns.numberFracDigit = patterns.numberExpDigit = patterns.numberDigit;

const eol = /[\u000A\u2028\u2029]|\u000D\u000A|\u000D/g;

const expected = {object: 'objectStop', array: 'arrayStop', '': 'done'};

class Verifier extends Writable {
  static make(options) {
    return new Verifier(options);
  }

  constructor(options) {
    super(Object.assign({}, options, {objectMode: false}));

    if (options) {
      this._jsonStreaming = options.jsonStreaming;
    }

    this._buffer = '';
    this._done = false;
    this._expect = this._jsonStreaming ? 'done' : 'value';
    this._stack = [];
    this._parent = '';

    this._line = this._pos = 1;
    this._offset = 0;
  }

  _write(chunk, encoding, callback) {
    if (typeof chunk == 'string') {
      this._write = this._writeString;
    } else {
      this._stringDecoder = new StringDecoder();
      this._write = this._writeBuffer;
    }
    this._write(chunk, encoding, callback);
  }

  _writeBuffer(chunk, _, callback) {
    this._buffer += this._stringDecoder.write(chunk);
    this._processBuffer(callback);
  }

  _writeString(chunk, _, callback) {
    this._buffer += chunk.toString();
    this._processBuffer(callback);
  }

  _final(callback) {
    if (this._stringDecoder) {
      this._buffer += this._stringDecoder.end();
    }
    this._done = true;
    this._processBuffer(callback);
  }

  _makeError(msg) {
    const error = new Error('ERROR at ' + this._offset + ' (' + this._line + ', ' + this._pos + '): ' + msg);
    error.line = this._line;
    error.pos = this._pos;
    error.offset = this._offset;
    return error;
  }

  _updatePos(value) {
    let len = value.length;
    this._offset += len;
    value.replace(eol, (match, offset) => {
      len = value.length - match.length - offset;
      ++this._line;
      this._pos = 1;
      return '';
    });
    this._pos += len;
  }

  _processBuffer(callback) {
    let match,
      value,
      index = 0;
    main: for (;;) {
      switch (this._expect) {
        case 'value1':
        case 'value':
          patterns.value1.lastIndex = index;
          match = patterns.value1.exec(this._buffer);
          if (!match) {
            if (this._done || index + MAX_PATTERN_SIZE < this._buffer.length) {
              if (index < this._buffer.length) return callback(this._makeError('Verifier cannot parse input: expected a value'));
              return callback(this._makeError('Verifier has expected a value'));
            }
            break main; // wait for more input
          }
          value = match[0];
          switch (value) {
            case '"':
              this._expect = 'string';
              break;
            case '{':
              this._stack.push(this._parent);
              this._parent = 'object';
              this._expect = 'key1';
              break;
            case '[':
              this._stack.push(this._parent);
              this._parent = 'array';
              this._expect = 'value1';
              break;
            case ']':
              if (this._expect !== 'value1') return callback(this._makeError("Verifier cannot parse input: unexpected token ']'"));
              this._parent = this._stack.pop();
              this._expect = expected[this._parent];
              break;
            case '-':
              this._expect = 'numberStart';
              break;
            case '0':
              this._expect = 'numberFraction';
              break;
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
              this._expect = 'numberDigit';
              break;
            case 'true':
            case 'false':
            case 'null':
              if (this._buffer.length - index === value.length && !this._done) break main; // wait for more input
              this._expect = expected[this._parent];
              break;
            // default: // ws
          }
          this._updatePos(value);
          if (noSticky) {
            this._buffer = this._buffer.slice(value.length);
          } else {
            index += value.length;
          }
          break;
        case 'keyVal':
        case 'string':
          patterns.string.lastIndex = index;
          match = patterns.string.exec(this._buffer);
          if (!match) {
            if (index < this._buffer.length && (this._done || this._buffer.length - index >= 6))
              return callback(this._makeError('Verifier cannot parse input: escaped characters'));
            if (this._done) return callback(this._makeError('Verifier has expected a string value'));
            break main; // wait for more input
          }
          value = match[0];
          if (value === '"') {
            if (this._expect === 'keyVal') {
              this._expect = 'colon';
            } else {
              this._expect = expected[this._parent];
            }
          }
          this._updatePos(value);
          if (noSticky) {
            this._buffer = this._buffer.slice(value.length);
          } else {
            index += value.length;
          }
          break;
        case 'key1':
        case 'key':
          patterns.key1.lastIndex = index;
          match = patterns.key1.exec(this._buffer);
          if (!match) {
            if (index < this._buffer.length || this._done) return callback(this._makeError('Verifier cannot parse input: expected an object key'));
            break main; // wait for more input
          }
          value = match[0];
          if (value === '"') {
            this._expect = 'keyVal';
          } else if (value === '}') {
            if (this._expect !== 'key1') return callback(this._makeError("Verifier cannot parse input: unexpected token '}'"));
            this._parent = this._stack.pop();
            this._expect = expected[this._parent];
          }
          this._updatePos(value);
          if (noSticky) {
            this._buffer = this._buffer.slice(value.length);
          } else {
            index += value.length;
          }
          break;
        case 'colon':
          patterns.colon.lastIndex = index;
          match = patterns.colon.exec(this._buffer);
          if (!match) {
            if (index < this._buffer.length || this._done) return callback(this._makeError("Verifier cannot parse input: expected ':'"));
            break main; // wait for more input
          }
          value = match[0];
          value === ':' && (this._expect = 'value');
          this._updatePos(value);
          if (noSticky) {
            this._buffer = this._buffer.slice(value.length);
          } else {
            index += value.length;
          }
          break;
        case 'arrayStop':
        case 'objectStop':
          patterns.comma.lastIndex = index;
          match = patterns.comma.exec(this._buffer);
          if (!match) {
            if (index < this._buffer.length || this._done) return callback(this._makeError("Verifier cannot parse input: expected ','"));
            break main; // wait for more input
          }
          value = match[0];
          if (value === ',') {
            this._expect = this._expect === 'arrayStop' ? 'value' : 'key';
          } else if (value === '}' || value === ']') {
            if (value === '}' ? this._expect === 'arrayStop' : this._expect !== 'arrayStop') {
              return callback(this._makeError("Verifier cannot parse input: expected '" + (this._expect === 'arrayStop' ? ']' : '}') + "'"));
            }
            this._parent = this._stack.pop();
            this._expect = expected[this._parent];
          }
          this._updatePos(value);
          if (noSticky) {
            this._buffer = this._buffer.slice(value.length);
          } else {
            index += value.length;
          }
          break;
        // number chunks
        case 'numberStart': // [0-9]
          patterns.numberStart.lastIndex = index;
          match = patterns.numberStart.exec(this._buffer);
          if (!match) {
            if (index < this._buffer.length || this._done) return callback(this._makeError('Verifier cannot parse input: expected a starting digit'));
            break main; // wait for more input
          }
          value = match[0];
          this._expect = value === '0' ? 'numberFraction' : 'numberDigit';
          this._updatePos(value);
          if (noSticky) {
            this._buffer = this._buffer.slice(value.length);
          } else {
            index += value.length;
          }
          break;
        case 'numberDigit': // [0-9]*
          patterns.numberDigit.lastIndex = index;
          match = patterns.numberDigit.exec(this._buffer);
          if (!match) {
            if (index < this._buffer.length || this._done) return callback(this._makeError('Verifier cannot parse input: expected a digit'));
            break main; // wait for more input
          }
          value = match[0];
          if (value) {
            this._updatePos(value);
            if (noSticky) {
              this._buffer = this._buffer.slice(value.length);
            } else {
              index += value.length;
            }
          } else {
            if (index < this._buffer.length) {
              this._expect = 'numberFraction';
              break;
            }
            if (this._done) {
              this._expect = expected[this._parent];
              break;
            }
            break main; // wait for more input
          }
          break;
        case 'numberFraction': // [\.eE]?
          patterns.numberFraction.lastIndex = index;
          match = patterns.numberFraction.exec(this._buffer);
          if (!match) {
            if (index < this._buffer.length || this._done) {
              this._expect = expected[this._parent];
              break;
            }
            break main; // wait for more input
          }
          value = match[0];
          this._expect = value === '.' ? 'numberFracStart' : 'numberExpSign';
          this._updatePos(value);
          if (noSticky) {
            this._buffer = this._buffer.slice(value.length);
          } else {
            index += value.length;
          }
          break;
        case 'numberFracStart': // [0-9]
          patterns.numberFracStart.lastIndex = index;
          match = patterns.numberFracStart.exec(this._buffer);
          if (!match) {
            if (index < this._buffer.length || this._done)
              return callback(this._makeError('Verifier cannot parse input: expected a fractional part of a number'));
            break main; // wait for more input
          }
          value = match[0];
          this._expect = 'numberFracDigit';
          this._updatePos(value);
          if (noSticky) {
            this._buffer = this._buffer.slice(value.length);
          } else {
            index += value.length;
          }
          break;
        case 'numberFracDigit': // [0-9]*
          patterns.numberFracDigit.lastIndex = index;
          match = patterns.numberFracDigit.exec(this._buffer);
          value = match[0];
          if (value) {
            this._updatePos(value);
            if (noSticky) {
              this._buffer = this._buffer.slice(value.length);
            } else {
              index += value.length;
            }
          } else {
            if (index < this._buffer.length) {
              this._expect = 'numberExponent';
              break;
            }
            if (this._done) {
              this._expect = expected[this._parent];
              break;
            }
            break main; // wait for more input
          }
          break;
        case 'numberExponent': // [eE]?
          patterns.numberExponent.lastIndex = index;
          match = patterns.numberExponent.exec(this._buffer);
          if (!match) {
            if (index < this._buffer.length) {
              this._expect = expected[this._parent];
              break;
            }
            if (this._done) {
              this._expect = 'done';
              break;
            }
            break main; // wait for more input
          }
          value = match[0];
          this._expect = 'numberExpSign';
          this._updatePos(value);
          if (noSticky) {
            this._buffer = this._buffer.slice(value.length);
          } else {
            index += value.length;
          }
          break;
        case 'numberExpSign': // [-+]?
          patterns.numberExpSign.lastIndex = index;
          match = patterns.numberExpSign.exec(this._buffer);
          if (!match) {
            if (index < this._buffer.length) {
              this._expect = 'numberExpStart';
              break;
            }
            if (this._done) return callback(this._makeError('Verifier has expected an exponent value of a number'));
            break main; // wait for more input
          }
          value = match[0];
          this._expect = 'numberExpStart';
          this._updatePos(value);
          if (noSticky) {
            this._buffer = this._buffer.slice(value.length);
          } else {
            index += value.length;
          }
          break;
        case 'numberExpStart': // [0-9]
          patterns.numberExpStart.lastIndex = index;
          match = patterns.numberExpStart.exec(this._buffer);
          if (!match) {
            if (index < this._buffer.length || this._done)
              return callback(this._makeError('Verifier cannot parse input: expected an exponent part of a number'));
            break main; // wait for more input
          }
          value = match[0];
          this._expect = 'numberExpDigit';
          this._updatePos(value);
          if (noSticky) {
            this._buffer = this._buffer.slice(value.length);
          } else {
            index += value.length;
          }
          break;
        case 'numberExpDigit': // [0-9]*
          patterns.numberExpDigit.lastIndex = index;
          match = patterns.numberExpDigit.exec(this._buffer);
          value = match[0];
          if (value) {
            this._updatePos(value);
            if (noSticky) {
              this._buffer = this._buffer.slice(value.length);
            } else {
              index += value.length;
            }
          } else {
            if (index < this._buffer.length || this._done) {
              this._expect = expected[this._parent];
              break;
            }
            break main; // wait for more input
          }
          break;
        case 'done':
          patterns.ws.lastIndex = index;
          match = patterns.ws.exec(this._buffer);
          if (!match) {
            if (index < this._buffer.length) {
              if (this._jsonStreaming) {
                this._expect = 'value';
                break;
              }
              return callback(this._makeError('Verifier cannot parse input: unexpected characters'));
            }
            break main; // wait for more input
          }
          value = match[0];
          this._updatePos(value);
          if (noSticky) {
            this._buffer = this._buffer.slice(value.length);
          } else {
            index += value.length;
          }
          break;
      }
    }
    !noSticky && (this._buffer = this._buffer.slice(index));
    callback(null);
  }
}
Verifier.verifier = Verifier.make;
Verifier.make.Constructor = Verifier;

module.exports = Verifier;
