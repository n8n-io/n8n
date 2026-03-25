'use strict';

const {Transform} = require('stream');

const noCommaAfter = {startObject: 1, startArray: 1, endKey: 1, keyValue: 1},
  noSpaceAfter = {endObject: 1, endArray: 1, '': 1},
  noSpaceBefore = {startObject: 1, startArray: 1},
  depthIncrement = {startObject: 1, startArray: 1},
  depthDecrement = {endObject: 1, endArray: 1},
  values = {startKey: 'keyValue', startString: 'stringValue', startNumber: 'numberValue'},
  stopNames = {startKey: 'endKey', startString: 'endString', startNumber: 'endNumber'},
  symbols = {
    startObject: '{',
    endObject: '}',
    startArray: '[',
    endArray: ']',
    startKey: '"',
    endKey: '":',
    startString: '"',
    endString: '"',
    startNumber: '',
    endNumber: '',
    nullValue: 'null',
    trueValue: 'true',
    falseValue: 'false'
  };

const skipValue = endName =>
  function (chunk, encoding, callback) {
    if (chunk.name === endName) {
      this._transform = this._prev_transform;
    }
    callback(null);
  };

const replaceSymbols = {'\b': '\\b', '\f': '\\f', '\n': '\\n', '\r': '\\r', '\t': '\\t', '"': '\\"', '\\': '\\\\'};
const sanitizeString = value =>
  value.replace(/[\b\f\n\r\t\"\\\u0000-\u001F\u007F-\u009F]/g, match =>
    replaceSymbols.hasOwnProperty(match) ? replaceSymbols[match] : '\\u' + ('0000' + match.charCodeAt(0).toString(16)).slice(-4)
  );

const doNothing = () => {};

class Stringer extends Transform {
  static make(options) {
    return new Stringer(options);
  }

  constructor(options) {
    super(Object.assign({}, options, {writableObjectMode: true, readableObjectMode: false}));

    this._values = {};
    if (options) {
      'useValues' in options && (this._values.keyValue = this._values.stringValue = this._values.numberValue = options.useValues);
      'useKeyValues' in options && (this._values.keyValue = options.useKeyValues);
      'useStringValues' in options && (this._values.stringValue = options.useStringValues);
      'useNumberValues' in options && (this._values.numberValue = options.useNumberValues);
      this._makeArray = options.makeArray;
    }

    this._prev = '';
    this._depth = 0;

    if (this._makeArray) {
      this._transform = this._arrayTransform;
      this._flush = this._arrayFlush;
    }
  }

  _arrayTransform(chunk, encoding, callback) {
    // it runs once
    delete this._transform;
    this._transform({name: 'startArray'}, encoding, doNothing);
    this._transform(chunk, encoding, callback);
  }

  _arrayFlush(callback) {
    if (this._transform === this._arrayTransform) {
      delete this._transform;
      this._transform({name: 'startArray'}, null, doNothing);
    }
    this._transform({name: 'endArray'}, null, callback);
  }

  _transform(chunk, _, callback) {
    if (this._values[chunk.name]) {
      if (this._depth && noCommaAfter[this._prev] !== 1) this.push(',');
      switch (chunk.name) {
        case 'keyValue':
          this.push('"' + sanitizeString(chunk.value) + '":');
          break;
        case 'stringValue':
          this.push('"' + sanitizeString(chunk.value) + '"');
          break;
        case 'numberValue':
          this.push(chunk.value);
          break;
      }
    } else {
      // filter out values
      switch (chunk.name) {
        case 'endObject':
        case 'endArray':
        case 'endKey':
        case 'endString':
        case 'endNumber':
          this.push(symbols[chunk.name]);
          break;
        case 'stringChunk':
          this.push(sanitizeString(chunk.value));
          break;
        case 'numberChunk':
          this.push(chunk.value);
          break;
        case 'keyValue':
        case 'stringValue':
        case 'numberValue':
          // skip completely
          break;
        case 'startKey':
        case 'startString':
        case 'startNumber':
          if (this._values[values[chunk.name]]) {
            this._prev_transform = this._transform;
            this._transform = skipValue(stopNames[chunk.name]);
            return callback(null);
          }
        // intentional fall down
        default:
          // case 'startObject': case 'startArray': case 'startKey': case 'startString':
          // case 'startNumber': case 'nullValue': case 'trueValue': case 'falseValue':
          if (this._depth) {
            if (noCommaAfter[this._prev] !== 1) this.push(',');
          } else {
            if (noSpaceAfter[this._prev] !== 1 && noSpaceBefore[chunk.name] !== 1) this.push(' ');
          }
          this.push(symbols[chunk.name]);
          break;
      }
      if (depthIncrement[chunk.name]) {
        ++this._depth;
      } else if (depthDecrement[chunk.name]) {
        --this._depth;
      }
    }
    this._prev = chunk.name;
    callback(null);
  }
}
Stringer.stringer = Stringer.make;
Stringer.make.Constructor = Stringer;

module.exports = Stringer;
