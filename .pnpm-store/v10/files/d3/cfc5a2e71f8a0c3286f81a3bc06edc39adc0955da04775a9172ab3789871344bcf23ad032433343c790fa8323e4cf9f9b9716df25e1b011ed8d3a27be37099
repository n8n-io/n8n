'use strict';

const Utf8Stream = require('./utils/Utf8Stream');

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

const values = {true: true, false: false, null: null},
  expected = {object: 'objectStop', array: 'arrayStop', '': 'done'};

// long hexadecimal codes: \uXXXX
const fromHex = s => String.fromCharCode(parseInt(s.slice(2), 16));

// short codes: \b \f \n \r \t \" \\ \/
const codes = {b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', '"': '"', '\\': '\\', '/': '/'};

class Parser extends Utf8Stream {
  static make(options) {
    return new Parser(options);
  }

  constructor(options) {
    super(Object.assign({}, options, {readableObjectMode: true}));

    this._packKeys = this._packStrings = this._packNumbers = this._streamKeys = this._streamStrings = this._streamNumbers = true;
    if (options) {
      'packValues' in options && (this._packKeys = this._packStrings = this._packNumbers = options.packValues);
      'packKeys' in options && (this._packKeys = options.packKeys);
      'packStrings' in options && (this._packStrings = options.packStrings);
      'packNumbers' in options && (this._packNumbers = options.packNumbers);
      'streamValues' in options && (this._streamKeys = this._streamStrings = this._streamNumbers = options.streamValues);
      'streamKeys' in options && (this._streamKeys = options.streamKeys);
      'streamStrings' in options && (this._streamStrings = options.streamStrings);
      'streamNumbers' in options && (this._streamNumbers = options.streamNumbers);
      this._jsonStreaming = options.jsonStreaming;
    }
    !this._packKeys && (this._streamKeys = true);
    !this._packStrings && (this._streamStrings = true);
    !this._packNumbers && (this._streamNumbers = true);

    this._done = false;
    this._expect = this._jsonStreaming ? 'done' : 'value';
    this._stack = [];
    this._parent = '';
    this._open_number = false;
    this._accumulator = '';
  }

  _flush(callback) {
    this._done = true;
    super._flush(error => {
      if (error) return callback(error);
      if (this._open_number) {
        if (this._streamNumbers) {
          this.push({name: 'endNumber'});
        }
        this._open_number = false;
        if (this._packNumbers) {
          this.push({name: 'numberValue', value: this._accumulator});
          this._accumulator = '';
        }
      }
      callback(null);
    });
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
              if (index < this._buffer.length) return callback(new Error('Parser cannot parse input: expected a value'));
              return callback(new Error('Parser has expected a value'));
            }
            break main; // wait for more input
          }
          value = match[0];
          switch (value) {
            case '"':
              this._streamStrings && this.push({name: 'startString'});
              this._expect = 'string';
              break;
            case '{':
              this.push({name: 'startObject'});
              this._stack.push(this._parent);
              this._parent = 'object';
              this._expect = 'key1';
              break;
            case '[':
              this.push({name: 'startArray'});
              this._stack.push(this._parent);
              this._parent = 'array';
              this._expect = 'value1';
              break;
            case ']':
              if (this._expect !== 'value1') return callback(new Error("Parser cannot parse input: unexpected token ']'"));
              if (this._open_number) {
                this._streamNumbers && this.push({name: 'endNumber'});
                this._open_number = false;
                if (this._packNumbers) {
                  this.push({name: 'numberValue', value: this._accumulator});
                  this._accumulator = '';
                }
              }
              this.push({name: 'endArray'});
              this._parent = this._stack.pop();
              this._expect = expected[this._parent];
              break;
            case '-':
              this._open_number = true;
              if (this._streamNumbers) {
                this.push({name: 'startNumber'});
                this.push({name: 'numberChunk', value: '-'});
              }
              this._packNumbers && (this._accumulator = '-');
              this._expect = 'numberStart';
              break;
            case '0':
              this._open_number = true;
              if (this._streamNumbers) {
                this.push({name: 'startNumber'});
                this.push({name: 'numberChunk', value: '0'});
              }
              this._packNumbers && (this._accumulator = '0');
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
              this._open_number = true;
              if (this._streamNumbers) {
                this.push({name: 'startNumber'});
                this.push({name: 'numberChunk', value: value});
              }
              this._packNumbers && (this._accumulator = value);
              this._expect = 'numberDigit';
              break;
            case 'true':
            case 'false':
            case 'null':
              if (this._buffer.length - index === value.length && !this._done) break main; // wait for more input
              this.push({name: value + 'Value', value: values[value]});
              this._expect = expected[this._parent];
              break;
            // default: // ws
          }
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
              return callback(new Error('Parser cannot parse input: escaped characters'));
            if (this._done) return callback(new Error('Parser has expected a string value'));
            break main; // wait for more input
          }
          value = match[0];
          if (value === '"') {
            if (this._expect === 'keyVal') {
              this._streamKeys && this.push({name: 'endKey'});
              if (this._packKeys) {
                this.push({name: 'keyValue', value: this._accumulator});
                this._accumulator = '';
              }
              this._expect = 'colon';
            } else {
              this._streamStrings && this.push({name: 'endString'});
              if (this._packStrings) {
                this.push({name: 'stringValue', value: this._accumulator});
                this._accumulator = '';
              }
              this._expect = expected[this._parent];
            }
          } else if (value.length > 1 && value.charAt(0) === '\\') {
            const t = value.length == 2 ? codes[value.charAt(1)] : fromHex(value);
            if (this._expect === 'keyVal' ? this._streamKeys : this._streamStrings) {
              this.push({name: 'stringChunk', value: t});
            }
            if (this._expect === 'keyVal' ? this._packKeys : this._packStrings) {
              this._accumulator += t;
            }
          } else {
            if (this._expect === 'keyVal' ? this._streamKeys : this._streamStrings) {
              this.push({name: 'stringChunk', value: value});
            }
            if (this._expect === 'keyVal' ? this._packKeys : this._packStrings) {
              this._accumulator += value;
            }
          }
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
            if (index < this._buffer.length || this._done) return callback(new Error('Parser cannot parse input: expected an object key'));
            break main; // wait for more input
          }
          value = match[0];
          if (value === '"') {
            this._streamKeys && this.push({name: 'startKey'});
            this._expect = 'keyVal';
          } else if (value === '}') {
            if (this._expect !== 'key1') return callback(new Error("Parser cannot parse input: unexpected token '}'"));
            this.push({name: 'endObject'});
            this._parent = this._stack.pop();
            this._expect = expected[this._parent];
          }
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
            if (index < this._buffer.length || this._done) return callback(new Error("Parser cannot parse input: expected ':'"));
            break main; // wait for more input
          }
          value = match[0];
          value === ':' && (this._expect = 'value');
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
            if (index < this._buffer.length || this._done) return callback(new Error("Parser cannot parse input: expected ','"));
            break main; // wait for more input
          }
          if (this._open_number) {
            this._streamNumbers && this.push({name: 'endNumber'});
            this._open_number = false;
            if (this._packNumbers) {
              this.push({name: 'numberValue', value: this._accumulator});
              this._accumulator = '';
            }
          }
          value = match[0];
          if (value === ',') {
            this._expect = this._expect === 'arrayStop' ? 'value' : 'key';
          } else if (value === '}' || value === ']') {
            if (value === '}' ? this._expect === 'arrayStop' : this._expect !== 'arrayStop') {
              return callback(new Error("Parser cannot parse input: expected '" + (this._expect === 'arrayStop' ? ']' : '}') + "'"));
            }
            this.push({name: value === '}' ? 'endObject' : 'endArray'});
            this._parent = this._stack.pop();
            this._expect = expected[this._parent];
          }
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
            if (index < this._buffer.length || this._done) return callback(new Error('Parser cannot parse input: expected a starting digit'));
            break main; // wait for more input
          }
          value = match[0];
          this._streamNumbers && this.push({name: 'numberChunk', value: value});
          this._packNumbers && (this._accumulator += value);
          this._expect = value === '0' ? 'numberFraction' : 'numberDigit';
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
            if (index < this._buffer.length || this._done) return callback(new Error('Parser cannot parse input: expected a digit'));
            break main; // wait for more input
          }
          value = match[0];
          if (value) {
            this._streamNumbers && this.push({name: 'numberChunk', value: value});
            this._packNumbers && (this._accumulator += value);
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
          this._streamNumbers && this.push({name: 'numberChunk', value: value});
          this._packNumbers && (this._accumulator += value);
          this._expect = value === '.' ? 'numberFracStart' : 'numberExpSign';
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
            if (index < this._buffer.length || this._done) return callback(new Error('Parser cannot parse input: expected a fractional part of a number'));
            break main; // wait for more input
          }
          value = match[0];
          this._streamNumbers && this.push({name: 'numberChunk', value: value});
          this._packNumbers && (this._accumulator += value);
          this._expect = 'numberFracDigit';
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
            this._streamNumbers && this.push({name: 'numberChunk', value: value});
            this._packNumbers && (this._accumulator += value);
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
          this._streamNumbers && this.push({name: 'numberChunk', value: value});
          this._packNumbers && (this._accumulator += value);
          this._expect = 'numberExpSign';
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
            if (this._done) return callback(new Error('Parser has expected an exponent value of a number'));
            break main; // wait for more input
          }
          value = match[0];
          this._streamNumbers && this.push({name: 'numberChunk', value: value});
          this._packNumbers && (this._accumulator += value);
          this._expect = 'numberExpStart';
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
            if (index < this._buffer.length || this._done) return callback(new Error('Parser cannot parse input: expected an exponent part of a number'));
            break main; // wait for more input
          }
          value = match[0];
          this._streamNumbers && this.push({name: 'numberChunk', value: value});
          this._packNumbers && (this._accumulator += value);
          this._expect = 'numberExpDigit';
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
            this._streamNumbers && this.push({name: 'numberChunk', value: value});
            this._packNumbers && (this._accumulator += value);
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
              return callback(new Error('Parser cannot parse input: unexpected characters'));
            }
            break main; // wait for more input
          }
          value = match[0];
          if (this._open_number) {
            this._streamNumbers && this.push({name: 'endNumber'});
            this._open_number = false;
            if (this._packNumbers) {
              this.push({name: 'numberValue', value: this._accumulator});
              this._accumulator = '';
            }
          }
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
Parser.parser = Parser.make;
Parser.make.Constructor = Parser;

module.exports = Parser;
