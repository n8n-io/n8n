'use strict';

const {Transform} = require('stream');

class FilterBase extends Transform {
  static stringFilter(string, separator) {
    return stack => {
      const path = stack.join(separator);
      return (
        (path.length === string.length && path === string) ||
        (path.length > string.length && path.substr(0, string.length) === string && path.substr(string.length, separator.length) === separator)
      );
    };
  }

  static regExpFilter(regExp, separator) {
    return stack => regExp.test(stack.join(separator));
  }

  static arrayReplacement(array) {
    return () => array;
  }

  constructor(options) {
    super(Object.assign({}, options, {writableObjectMode: true, readableObjectMode: true}));
    this._transform = this._check;
    this._stack = [];

    const filter = options && options.filter,
      separator = (options && options.pathSeparator) || '.';
    if (typeof filter == 'string') {
      this._filter = FilterBase.stringFilter(filter, separator);
    } else if (typeof filter == 'function') {
      this._filter = filter;
    } else if (filter instanceof RegExp) {
      this._filter = FilterBase.regExpFilter(filter, separator);
    }

    const replacement = options && options.replacement;
    if (typeof replacement == 'function') {
      this._replacement = replacement;
    } else {
      this._replacement = FilterBase.arrayReplacement(replacement || FilterBase.defaultReplacement);
    }
    this._allowEmptyReplacement = options && options.allowEmptyReplacement;

    this._streamKeys = true;
    if (options) {
      'streamValues' in options && (this._streamKeys = options.streamValues);
      'streamKeys' in options && (this._streamKeys = options.streamKeys);
    }

    this._once = options && options.once;
    this._previousToken = '';
  }

  _check(chunk, _, callback) {
    // update the last stack key
    switch (chunk.name) {
      case 'startObject':
      case 'startArray':
      case 'startString':
      case 'startNumber':
      case 'nullValue':
      case 'trueValue':
      case 'falseValue':
        if (typeof this._stack[this._stack.length - 1] == 'number') {
          // array
          ++this._stack[this._stack.length - 1];
        }
        break;
      case 'keyValue':
        this._stack[this._stack.length - 1] = chunk.value;
        break;
      case 'numberValue':
        if (this._previousToken !== 'endNumber' && typeof this._stack[this._stack.length - 1] == 'number') {
          // array
          ++this._stack[this._stack.length - 1];
        }
        break;
      case 'stringValue':
        if (this._previousToken !== 'endString' && typeof this._stack[this._stack.length - 1] == 'number') {
          // array
          ++this._stack[this._stack.length - 1];
        }
        break;
    }
    this._previousToken = chunk.name;
    // check, if we allow a chunk
    if (this._checkChunk(chunk)) {
      return callback(null);
    }
    // update the stack
    switch (chunk.name) {
      case 'startObject':
        this._stack.push(null);
        break;
      case 'startArray':
        this._stack.push(-1);
        break;
      case 'endObject':
      case 'endArray':
        this._stack.pop();
        break;
    }
    callback(null);
  }

  _passObject(chunk, _, callback) {
    this.push(chunk);
    switch (chunk.name) {
      case 'startObject':
      case 'startArray':
        ++this._depth;
        break;
      case 'endObject':
      case 'endArray':
        --this._depth;
        break;
    }
    if (!this._depth) {
      this._transform = this._once ? this._skip : this._check;
    }
    callback(null);
  }

  _pass(chunk, _, callback) {
    this.push(chunk);
    callback(null);
  }

  _skipObject(chunk, _, callback) {
    switch (chunk.name) {
      case 'startObject':
      case 'startArray':
        ++this._depth;
        break;
      case 'endObject':
      case 'endArray':
        --this._depth;
        break;
    }
    if (!this._depth) {
      this._transform = this._once ? this._pass : this._check;
    }
    callback(null);
  }

  _skip(chunk, _, callback) {
    callback(null);
  }
}

FilterBase.defaultReplacement = [{name: 'nullValue', value: null}];

const passValue = (last, post) =>
  function(chunk, _, callback) {
    if (this._expected) {
      const expected = this._expected;
      this._expected = '';
      this._transform = this._once ? this._skip : this._check;
      if (expected === chunk.name) {
        this.push(chunk);
      } else {
        return this._transform(chunk, _, callback);
      }
    } else {
      this.push(chunk);
      if (chunk.name === last) {
        this._expected = post;
      }
    }
    callback(null);
  };

FilterBase.prototype._passNumber = passValue('endNumber', 'numberValue');
FilterBase.prototype._passString = passValue('endString', 'stringValue');
FilterBase.prototype._passKey = passValue('endKey', 'keyValue');

const skipValue = (last, post) =>
  function(chunk, _, callback) {
    if (this._expected) {
      const expected = this._expected;
      this._expected = '';
      this._transform = this._once ? this._pass : this._check;
      if (expected !== chunk.name) {
        return this._transform(chunk, _, callback);
      }
    } else {
      if (chunk.name === last) {
        this._expected = post;
      }
    }
    callback(null);
  };

FilterBase.prototype._skipNumber = skipValue('endNumber', 'numberValue');
FilterBase.prototype._skipString = skipValue('endString', 'stringValue');
FilterBase.prototype._skipKey = skipValue('endKey', 'keyValue');

module.exports = FilterBase;
