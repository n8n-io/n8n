'use strict';

var fs = require('fs');
var assert = require('assert');
var Promise = require('promise');
var isPromise = require('is-promise');

var tr = (module.exports = function (transformer) {
  return new Transformer(transformer);
});
tr.Transformer = Transformer;
tr.normalizeFn = normalizeFn;
tr.normalizeFnAsync = normalizeFnAsync;
tr.normalize = normalize;
tr.normalizeAsync = normalizeAsync;
if (fs.readFile) {
  tr.readFile = Promise.denodeify(fs.readFile);
  tr.readFileSync = fs.readFileSync;
} else {
  tr.readFile = function () { throw new Error('fs.readFile unsupported'); };
  tr.readFileSync = function () { throw new Error('fs.readFileSync unsupported'); };
}

function normalizeFn(result) {
  if (typeof result === 'function') {
    return {fn: result, dependencies: []};
  } else if (result && typeof result === 'object' && typeof result.fn === 'function') {
    if ('dependencies' in result) {
      if (!Array.isArray(result.dependencies)) {
        throw new Error('Result should have a dependencies property that is an array');
      }
    } else {
      result.dependencies = [];
    }
    return result;
  } else {
    throw new Error('Invalid result object from transform.');
  }
}
function normalizeFnAsync(result, cb) {
  return Promise.resolve(result).then(function (result) {
    if (result && isPromise(result.fn)) {
      return result.fn.then(function (fn) {
        result.fn = fn;
        return result;
      });
    }
    return result;
  }).then(tr.normalizeFn).nodeify(cb);
}
function normalize(result) {
  if (typeof result === 'string') {
    return {body: result, dependencies: []};
  } else if (result && typeof result === 'object' && typeof result.body === 'string') {
    if ('dependencies' in result) {
      if (!Array.isArray(result.dependencies)) {
        throw new Error('Result should have a dependencies property that is an array');
      }
    } else {
      result.dependencies = [];
    }
    return result;
  } else {
    throw new Error('Invalid result object from transform.');
  }
}
function normalizeAsync(result, cb) {
  return Promise.resolve(result).then(function (result) {
    if (result && isPromise(result.body)) {
      return result.body.then(function (body) {
        result.body = body;
        return result;
      });
    }
    return result;
  }).then(tr.normalize).nodeify(cb);
}

function Transformer(tr) {
  assert(tr, 'Transformer must be an object');
  assert(typeof tr.name === 'string', 'Transformer must have a name');
  assert(typeof tr.outputFormat === 'string', 'Transformer must have an output format');
  assert([
    'compile',
    'compileAsync',
    'compileFile',
    'compileFileAsync',
    'compileClient',
    'compileClientAsync',
    'compileFileClient',
    'compileFileClientAsync',
    'render',
    'renderAsync',
    'renderFile',
    'renderFileAsync'
  ].some(function (method) {
    return typeof tr[method] === 'function';
  }), 'Transformer must implement at least one of the potential methods.');
  this._tr = tr;
  this.name = this._tr.name;
  this.outputFormat = this._tr.outputFormat;
  this.inputFormats = this._tr.inputFormats || [this.name];
}

var fallbacks = {
  compile: ['compile', 'render'],
  compileAsync: ['compileAsync', 'compile', 'render'],
  compileFile: ['compileFile', 'compile', 'renderFile', 'render'],
  compileFileAsync: [
    'compileFileAsync', 'compileFile', 'compileAsync', 'compile',
    'renderFile', 'render'
  ],
  compileClient: ['compileClient'],
  compileClientAsync: ['compileClientAsync', 'compileClient'],
  compileFileClient: ['compileFileClient', 'compileClient'],
  compileFileClientAsync: [
    'compileFileClientAsync', 'compileFileClient', 'compileClientAsync', 'compileClient'
  ],
  render: ['render', 'compile'],
  renderAsync: ['renderAsync', 'render', 'compileAsync', 'compile'],
  renderFile: ['renderFile', 'render', 'compileFile', 'compile'],
  renderFileAsync: [
    'renderFileAsync', 'renderFile', 'renderAsync', 'render',
    'compileFileAsync', 'compileFile', 'compileAsync', 'compile'
  ]
};

Transformer.prototype._hasMethod = function (method) {
  return typeof this._tr[method] === 'function';
};
Transformer.prototype.can = function (method) {
  return fallbacks[method].some(function (method) {
    return this._hasMethod(method);
  }.bind(this));
};

/* COMPILE */

Transformer.prototype.compile = function (str, options) {
  if (!this._hasMethod('compile')) {
    if (this.can('render')) {
      var _this = this;
      return {
        fn: function (locals) {
          return tr.normalize(_this._tr.render(str, options, locals)).body;
        },
        dependencies: []
      };
    }
    if (this.can('compileAsync')) {
      throw new Error('The Transform "' + this.name + '" does not support synchronous compilation');
    } else if (this.can('compileFileAsync')) {
      throw new Error('The Transform "' + this.name + '" does not support compiling plain strings');
    } else {
      throw new Error('The Transform "' + this.name + '" does not support compilation');
    }
  }
  return tr.normalizeFn(this._tr.compile(str, options));
};
Transformer.prototype.compileAsync = function (str, options, cb) {
  if (!this.can('compileAsync')) { // compileFile* || renderFile* || renderAsync || compile*Client*
    return Promise.reject(new Error('The Transform "' + this.name + '" does not support compiling plain strings')).nodeify(cb);
  }
  if (this._hasMethod('compileAsync')) {
    return tr.normalizeFnAsync(this._tr.compileAsync(str, options), cb);
  } else { // render || compile
    return tr.normalizeFnAsync(this.compile(str, options), cb);
  }
};
Transformer.prototype.compileFile = function (filename, options) {
  if (!this.can('compileFile')) { // compile*Client* || compile*Async || render*Async
    throw new Error('The Transform "' + this.name + '" does not support synchronous compilation');
  }
  if (this._hasMethod('compileFile')) {
    return tr.normalizeFn(this._tr.compileFile(filename, options));
  } else if (this._hasMethod('renderFile')) {
    return tr.normalizeFn(function (locals) {
      return tr.normalize(this._tr.renderFile(filename, options, locals)).body;
    }.bind(this));
  } else { // render || compile
    if (!options) options = {};
    if (options.filename === undefined) options.filename = filename;
    return this.compile(tr.readFileSync(filename, 'utf8'), options);
  }
};
Transformer.prototype.compileFileAsync = function (filename, options, cb) {
  if (!this.can('compileFileAsync')) {
    return Promise.reject(new Error('The Transform "' + this.name + '" does not support compilation'));
  }
  if (this._hasMethod('compileFileAsync')) {
    return tr.normalizeFnAsync(this._tr.compileFileAsync(filename, options), cb);
  } else if (this._hasMethod('compileFile') || this._hasMethod('renderFile')) {
    return tr.normalizeFnAsync(this.compileFile(filename, options), cb);
  } else { // compileAsync || compile || render
    if (!options) options = {};
    if (options.filename === undefined) options.filename = filename;
    return tr.normalizeFnAsync(tr.readFile(filename, 'utf8').then(function (str) {
      if (this._hasMethod('compileAsync')) {
        return this._tr.compileAsync(str, options);
      } else { // compile || render
        return this.compile(str, options);
      }
    }.bind(this)), cb);
  }
};

/* COMPILE CLIENT */


Transformer.prototype.compileClient = function (str, options) {
  if (!this.can('compileClient')) {
    if (this.can('compileClientAsync')) {
      throw new Error('The Transform "' + this.name + '" does not support compiling for the client synchronously.');
    } else if (this.can('compileFileClientAsync')) {
      throw new Error('The Transform "' + this.name + '" does not support compiling for the client from a string.');
    } else {
      throw new Error('The Transform "' + this.name + '" does not support compiling for the client');
    }
  }
  return tr.normalize(this._tr.compileClient(str, options));
};
Transformer.prototype.compileClientAsync = function (str, options, cb) {
  if (!this.can('compileClientAsync')) {
    if (this.can('compileFileClientAsync')) {
      return Promise.reject(new Error('The Transform "' + this.name + '" does not support compiling for the client from a string.')).nodeify(cb);
    } else {
      return Promise.reject(new Error('The Transform "' + this.name + '" does not support compiling for the client')).nodeify(cb);
    }
  }
  if (this._hasMethod('compileClientAsync')) {
    return tr.normalizeAsync(this._tr.compileClientAsync(str, options), cb);
  } else {
    return tr.normalizeAsync(this._tr.compileClient(str, options), cb);
  }
};
Transformer.prototype.compileFileClient = function (filename, options) {
  if (!this.can('compileFileClient')) {
    if (this.can('compileFileClientAsync')) {
      throw new Error('The Transform "' + this.name + '" does not support compiling for the client synchronously.');
    } else {
      throw new Error('The Transform "' + this.name + '" does not support compiling for the client');
    }
  }
  if (this._hasMethod('compileFileClient')) {
    return tr.normalize(this._tr.compileFileClient(filename, options));
  } else {
    if (!options) options = {};
    if (options.filename === undefined) options.filename = filename;
    return tr.normalize(this._tr.compileClient(tr.readFileSync(filename, 'utf8'), options));
  }
};
Transformer.prototype.compileFileClientAsync = function (filename, options, cb) {
  if (!this.can('compileFileClientAsync')) {
    return Promise.reject(new Error('The Transform "' + this.name + '" does not support compiling for the client')).nodeify(cb)
  }
  if (this._hasMethod('compileFileClientAsync')) {
    return tr.normalizeAsync(this._tr.compileFileClientAsync(filename, options), cb);
  } else if (this._hasMethod('compileFileClient')) {
    return tr.normalizeAsync(this._tr.compileFileClient(filename, options), cb);
  } else {
    if (!options) options = {};
    if (options.filename === undefined) options.filename = filename;
    return tr.normalizeAsync(tr.readFile(filename, 'utf8').then(function (str) {
      if (this._hasMethod('compileClientAsync')) {
        return this._tr.compileClientAsync(str, options);
      } else {
        return this._tr.compileClient(str, options);
      }
    }.bind(this)), cb);
  }
};

/* RENDER */

Transformer.prototype.render = function (str, options, locals) {
  if (!this.can('render')) {
    if (this.can('renderAsync')) {
      throw new Error('The Transform "' + this.name + '" does not support rendering synchronously.');
    } else if (this.can('renderFileAsync')) {
      throw new Error('The Transform "' + this.name + '" does not support rendering from a string.');
    } else {
      throw new Error('The Transform "' + this.name + '" does not support rendering');
    }
  }
  if (this._hasMethod('render')) {
    return tr.normalize(this._tr.render(str, options, locals));
  } else {
    var compiled = tr.normalizeFn(this._tr.compile(str, options));
    var body = compiled.fn(locals || options);
    if (typeof body !== 'string') {
      throw new Error('The Transform "' + this.name + '" does not support rendering synchronously.');
    }
    return tr.normalize({body: body, dependencies: compiled.dependencies});
  }
};
Transformer.prototype.renderAsync = function (str, options, locals, cb) {
  if (typeof locals === 'function') {
    cb = locals;
    locals = options;
  }
  if (!this.can('renderAsync')) {
    if (this.can('renderFileAsync')) {
      return Promise.reject(new Error('The Transform "' + this.name + '" does not support rendering from a string.')).nodeify(cb);
    } else {
      return Promise.reject(new Error('The Transform "' + this.name + '" does not support rendering')).nodeify(cb);
    }
  }
  if (this._hasMethod('renderAsync')) {
    return tr.normalizeAsync(this._tr.renderAsync(str, options, locals), cb);
  } else if (this._hasMethod('render')) {
    return tr.normalizeAsync(this._tr.render(str, options, locals), cb);
  } else {
    return tr.normalizeAsync(this.compileAsync(str, options).then(function (compiled) {
      return {body: compiled.fn(locals || options), dependencies: compiled.dependencies};
    }), cb);
  }
};
Transformer.prototype.renderFile = function (filename, options, locals) {
  if (!this.can('renderFile')) { // *Async, *Client
    throw new Error('The Transform "' + this.name + '" does not support rendering synchronously.');
  }

  if (this._hasMethod('renderFile')) {
    return tr.normalize(this._tr.renderFile(filename, options, locals));
  } else if (this._hasMethod('render')) {
    if (!options) options = {};
    if (options.filename === undefined) options.filename = filename;
    return tr.normalize(this._tr.render(tr.readFileSync(filename, 'utf8'), options, locals));
  } else { // compile || compileFile
    var compiled = this.compileFile(filename, options);
    return tr.normalize({body: compiled.fn(locals || options), dependencies: compiled.dependencies});
  }
};
Transformer.prototype.renderFileAsync = function (filename, options, locals, cb) {
  if (!this.can('renderFileAsync')) { // *Client
    throw new Error('The Transform "' + this.name + '" does not support rendering.');
  }

  if (typeof locals === 'function') {
    cb = locals;
    locals = options;
  }
  if (this._hasMethod('renderFileAsync')) {
    return tr.normalizeAsync(this._tr.renderFileAsync(filename, options, locals), cb);
  } else if (this._hasMethod('renderFile')) {
    return tr.normalizeAsync(this._tr.renderFile(filename, options, locals), cb);
  } else if (this._hasMethod('compile') || this._hasMethod('compileAsync')
             || this._hasMethod('compileFile') || this._hasMethod('compileFileAsync')) {
    return tr.normalizeAsync(this.compileFileAsync(filename, options).then(function (compiled) {
      return {body: compiled.fn(locals || options), dependencies: compiled.dependencies};
    }), cb);
  } else { // render || renderAsync
    if (!options) options = {};
    if (options.filename === undefined) options.filename = filename;
    return tr.normalizeAsync(tr.readFile(filename, 'utf8').then(function (str) {
      return this.renderAsync(str, options, locals);
    }.bind(this)), cb);
  }
};
