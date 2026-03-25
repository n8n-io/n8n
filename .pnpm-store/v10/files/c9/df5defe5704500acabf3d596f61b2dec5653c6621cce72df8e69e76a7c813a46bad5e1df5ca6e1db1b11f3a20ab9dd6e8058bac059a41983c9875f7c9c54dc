/* jshint node: true */

// TODO: Add minimal templating.
// TODO: Add option to prefix nested type declarations with the outer types'
// names.

'use strict';

/** IDL to protocol (services) and schema (types) parsing logic. */

var files = require('./files'),
    utils = require('./utils'),
    path = require('path'),
    util = require('util');


var f = util.format;


// Default type references defined by Avro.
var TYPE_REFS = {
  date: {type: 'int', logicalType: 'date'},
  decimal: {type: 'bytes', logicalType: 'decimal'},
  time_ms: {type: 'long', logicalType: 'time-millis'},
  timestamp_ms: {type: 'long', logicalType: 'timestamp-millis'}
};


/** Assemble an IDL file into a decoded protocol. */
function assembleProtocol(fpath, opts, cb) {
  if (!cb && typeof opts == 'function') {
    cb = opts;
    opts = undefined;
  }
  opts = opts || {};
  if (!opts.importHook) {
    opts.importHook = files.createImportHook();
  }

  importFile(fpath, function (err, protocol) {
    if (err) {
      cb(err);
      return;
    }
    if (!protocol) {
      cb(new Error('empty root import'));
      return;
    }
    var schemas = protocol.types;
    if (schemas) {
      // Strip redundant namespaces from types before returning the protocol.
      // Note that we keep empty (`''`) nested namespaces when the outer one is
      // non-empty. This allows figuring out whether unqualified imported names
      // should be qualified by the protocol's namespace: they should if their
      // namespace is `undefined` and should not if it is empty.
      var namespace = protocolNamespace(protocol) || '';
      schemas.forEach(function (schema) {
        if (schema.namespace === namespace) {
          delete schema.namespace;
        }
      });
    }
    cb(null, protocol);
  });

  function importFile(fpath, cb) {
    opts.importHook(fpath, 'idl', function (err, str) {
      if (err) {
        cb(err);
        return;
      }
      if (str === undefined) {
        // This signals an already imported file by the default import hooks.
        // Implementors who wish to disallow duplicate imports should provide a
        // custom hook which throws an error when a duplicate is detected.
        cb();
        return;
      }
      try {
        var reader = new Reader(str, opts);
        var obj = reader._readProtocol(str, opts);
      } catch (err) {
        err.path = fpath; // To help debug which file caused the error.
        cb(err);
        return;
      }
      fetchImports(obj.protocol, obj.imports, path.dirname(fpath), cb);
    });
  }

  function fetchImports(protocol, imports, dpath, cb) {
    var importedProtocols = [];
    next();

    function next() {
      var info = imports.shift();
      if (!info) {
        // We are done with this file. We prepend all imported types to this
        // file's and we can return the final result.
        importedProtocols.reverse();
        try {
          importedProtocols.forEach(function (imported) {
            mergeImport(protocol, imported);
          });
        } catch (err) {
          cb(err);
          return;
        }
        cb(null, protocol);
        return;
      }
      var importPath = path.join(dpath, info.name);
      if (info.kind === 'idl') {
        importFile(importPath, function (err, imported) {
          if (err) {
            cb(err);
            return;
          }
          if (imported) {
            importedProtocols.push(imported);
          }
          next();
        });
      } else {
        // We are importing a protocol or schema file.
        opts.importHook(importPath, info.kind, function (err, str) {
          if (err) {
            cb(err);
            return;
          }
          switch (info.kind) {
            case 'protocol':
            case 'schema':
              if (str === undefined) {
                // Skip duplicate import (see related comment above).
                next();
                return;
              }
              try {
                var obj = JSON.parse(str);
              } catch (err) {
                err.path = importPath;
                cb(err);
                return;
              }
              var imported = info.kind === 'schema' ? {types: [obj]} : obj;
              importedProtocols.push(imported);
              next();
              return;
            default:
              cb(new Error(f('invalid import kind: %s', info.kind)));
          }
        });
      }
    }
  }

  function mergeImport(protocol, imported) {
    // Merge first the types (where we don't need to check for duplicates
    // since instantiating the service will take care of it), then the messages
    // (where we need to, as duplicates will overwrite each other).
    var schemas = imported.types || [];
    schemas.reverse();
    schemas.forEach(function (schema) {
      if (!protocol.types) {
        protocol.types = [];
      }
      // Ensure the imported protocol's namespace is inherited correctly (it
      // might be different from the current one).
      if (schema.namespace === undefined) {
        schema.namespace = protocolNamespace(imported) || '';
      }
      protocol.types.unshift(schema);
    });
    Object.keys(imported.messages || {}).forEach(function (name) {
      if (!protocol.messages) {
        protocol.messages = {};
      }
      if (protocol.messages[name]) {
        throw new Error(f('duplicate message: %s', name));
      }
      protocol.messages[name] = imported.messages[name];
    });
  }
}

// Parsing functions.

/**
 * Convenience function to parse multiple inputs into protocols and schemas.
 *
 * It should cover most basic use-cases but has a few limitations:
 *
 * + It doesn't allow passing options to the parsing step.
 * + The protocol/type inference logic can be deceived.
 *
 * The parsing logic is as follows:
 *
 * + If `str` contains `path.sep` (on windows `\`, otherwise `/`) and is a path
 *   to an existing file, it will first be read as JSON, then as an IDL
 *   specification if JSON parsing failed. If either succeeds, the result is
 *   returned, otherwise the next steps are run using the file's content
 *   instead of the input path.
 * + If `str` is a valid JSON string, it is parsed then returned.
 * + If `str` is a valid IDL protocol specification, it is parsed and returned
 *   if no imports are present (and an error is thrown if there are any
 *   imports).
 * + If `str` is a valid IDL type specification, it is parsed and returned.
 * + If neither of the above cases apply, `str` is returned.
 */
function read(str) {
  var schema;
  if (typeof str == 'string' && ~str.indexOf(path.sep) && files.existsSync(str)) {
    // Try interpreting `str` as path to a file contain a JSON schema or an IDL
    // protocol. Note that we add the second check to skip primitive references
    // (e.g. `"int"`, the most common use-case for `avro.parse`).
    var contents = files.readFileSync(str, {encoding: 'utf8'});
    try {
      return JSON.parse(contents);
    } catch (err) {
      var opts = {importHook: files.createSyncImportHook()};
      assembleProtocol(str, opts, function (err, protocolSchema) {
        schema = err ? contents : protocolSchema;
      });
    }
  } else {
    schema = str;
  }
  if (typeof schema != 'string' || schema === 'null') {
    // This last predicate is to allow `read('null')` to work similarly to
    // `read('int')` and other primitives (null needs to be handled separately
    // since it is also a valid JSON identifier).
    return schema;
  }
  try {
    return JSON.parse(schema);
  } catch (err) {
    try {
      return Reader.readProtocol(schema);
    } catch (err) {
      try {
        return Reader.readSchema(schema);
      } catch (err) {
        return schema;
      }
    }
  }
}

function Reader(str, opts) {
  opts = opts || {};

  this._tk = new Tokenizer(str);
  this._ackVoidMessages = !!opts.ackVoidMessages;
  this._implicitTags = !opts.delimitedCollections;
  this._typeRefs = opts.typeRefs || TYPE_REFS;
}

Reader.readProtocol = function (str, opts) {
  var reader = new Reader(str, opts);
  var protocol = reader._readProtocol();
  if (protocol.imports.length) {
    // Imports can only be resolved when the IDL file is provided via its
    // path, we fail rather than silently ignore imports.
    throw new Error('unresolvable import');
  }
  return protocol.protocol;
};

Reader.readSchema = function (str, opts) {
  var reader = new Reader(str, opts);
  var doc = reader._readJavadoc();
  var schema = reader._readType(doc === undefined ? {} : {doc: doc}, true);
  reader._tk.next({id: '(eof)'}); // Check that we have read everything.
  return schema;
};

Reader.prototype._readProtocol = function () {
  var tk = this._tk;
  var imports = [];
  var types = [];
  var messages = {};
  var pos;

  // Outer declarations (outside of the protocol block).
  this._readImports(imports);
  var protocolSchema = {};
  var protocolJavadoc = this._readJavadoc();
  if (protocolJavadoc !== undefined) {
    protocolSchema.doc = protocolJavadoc;
  }
  this._readAnnotations(protocolSchema);
  tk.next({val: 'protocol'});
  if (!tk.next({val: '{', silent: true})) {
    // Named protocol.
    protocolSchema.protocol = tk.next({id: 'name'}).val;
    tk.next({val: '{'});
  }

  // Inner declarations.
  while (!tk.next({val: '}', silent: true})) {
    if (!this._readImports(imports)) {
      var javadoc = this._readJavadoc();
      var typeSchema = this._readType({}, true);
      var numImports = this._readImports(imports, true);
      var message = undefined;
      // We mark our position and try to parse a message from here.
      pos = tk.pos;
      if (!numImports && (message = this._readMessage(typeSchema))) {
        // Note that if any imports were found, we cannot be parsing a message.
        if (javadoc !== undefined && message.schema.doc === undefined) {
          message.schema.doc = javadoc;
        }
        var oneWay = false;
        if (
          message.schema.response === 'void' ||
          message.schema.response.type === 'void'
        ) {
          oneWay = !this._ackVoidMessages && !message.schema.errors;
          if (message.schema.response === 'void') {
            message.schema.response = 'null';
          } else {
            message.schema.response.type = 'null';
          }
        }
        if (oneWay) {
          message.schema['one-way'] = true;
        }
        if (messages[message.name]) {
          // We have to do this check here otherwise the duplicate will be
          // overwritten (and service instantiation won't be able to catch it).
          throw new Error(f('duplicate message: %s', message.name));
        }
        messages[message.name] = message.schema;
      } else {
        // This was a standalone type definition.
        if (javadoc) {
          if (typeof typeSchema == 'string') {
            typeSchema = {doc: javadoc, type: typeSchema};
          } else if (typeSchema.doc === undefined) {
            typeSchema.doc = javadoc;
          }
        }
        types.push(typeSchema);
        // We backtrack until just before the type's type name and swallow an
        // eventual semi-colon (to make type declarations more consistent).
        tk.pos = pos;
        tk.next({val: ';', silent: true});
      }
      javadoc = undefined;
    }
  }
  tk.next({id: '(eof)'});
  if (types.length) {
    protocolSchema.types = types;
  }
  if (Object.keys(messages).length) {
    protocolSchema.messages = messages;
  }
  return {protocol: protocolSchema, imports: imports};
};

Reader.prototype._readAnnotations = function (schema) {
  var tk = this._tk;
  while (tk.next({val: '@', silent: true})) {
    // Annotations are allowed to have names which aren't valid Avro names,
    // we must advance until we hit the first left parenthesis.
    var parts = [];
    while (!tk.next({val: '(', silent: true})) {
      parts.push(tk.next().val);
    }
    schema[parts.join('')] = tk.next({id: 'json'}).val;
    tk.next({val: ')'});
  }
};

Reader.prototype._readMessage = function (responseSchema) {
  var tk = this._tk;
  var schema = {request: [], response: responseSchema};
  this._readAnnotations(schema);
  var name = tk.next().val;
  if (tk.next().val !== '(') {
    // This isn't a message.
    return;
  }
  if (!tk.next({val: ')', silent: true})) {
    do {
      schema.request.push(this._readField());
    } while (!tk.next({val: ')', silent: true}) && tk.next({val: ','}));
  }
  var token = tk.next();
  switch (token.val) {
    case 'throws':
      // It doesn't seem like the IDL is explicit about which syntax to used
      // for multiple errors. We will assume a comma-separated list.
      schema.errors = [];
      do {
        schema.errors.push(this._readType());
      } while (!tk.next({val: ';', silent: true}) && tk.next({val: ','}));
      break;
    case 'oneway':
      schema['one-way'] = true;
      tk.next({val: ';'});
      break;
    case ';':
      break;
    default:
      throw tk.error('invalid message suffix', token);
  }
  return {name: name, schema: schema};
};

Reader.prototype._readJavadoc = function () {
  var token = this._tk.next({id: 'javadoc', emitJavadoc: true, silent: true});
  if (token) {
    return token.val;
  }
};

Reader.prototype._readField = function () {
  var tk = this._tk;
  var javadoc = this._readJavadoc();
  var schema = {type: this._readType()};
  if (javadoc !== undefined && schema.doc === undefined) {
    schema.doc = javadoc;
  }
  this._readAnnotations(schema);
  schema.name = tk.next({id: 'name'}).val;
  if (tk.next({val: '=', silent: true})) {
    schema['default'] = tk.next({id: 'json'}).val;
  }
  return schema;
};

Reader.prototype._readType = function (schema, top) {
  schema = schema || {};
  this._readAnnotations(schema);
  schema.type = this._tk.next({id: 'name'}).val;
  switch (schema.type) {
    case 'record':
    case 'error':
      return this._readRecord(schema);
    case 'fixed':
      return this._readFixed(schema);
    case 'enum':
      return this._readEnum(schema, top);
    case 'map':
      return this._readMap(schema);
    case 'array':
      return this._readArray(schema);
    case 'union':
      if (Object.keys(schema).length > 1) {
        throw new Error('union annotations are not supported');
      }
      return this._readUnion();
    default:
      // Reference.
      var ref = this._typeRefs[schema.type];
      if (ref) {
        delete schema.type; // Always overwrite the type.
        utils.copyOwnProperties(ref, schema);
      }
      return Object.keys(schema).length > 1 ? schema : schema.type;
  }
};

Reader.prototype._readFixed = function (schema) {
  var tk = this._tk;
  if (!tk.next({val: '(', silent: true})) {
    schema.name = tk.next({id: 'name'}).val;
    tk.next({val: '('});
  }
  schema.size = parseInt(tk.next({id: 'number'}).val);
  tk.next({val: ')'});
  return schema;
};

Reader.prototype._readMap = function (schema) {
  var tk = this._tk;
  // Brackets are unwieldy when declaring inline types. We allow for them to be
  // omitted (but we keep the consistency that if the entry bracket is present,
  // the exit one must be as well). Note that this is non-standard.
  var silent = this._implicitTags;
  var implicitTags = tk.next({val: '<', silent: silent}) === undefined;
  schema.values = this._readType();
  tk.next({val: '>', silent: implicitTags});
  return schema;
};

Reader.prototype._readArray = function (schema) {
  var tk = this._tk;
  var silent = this._implicitTags;
  var implicitTags = tk.next({val: '<', silent: silent}) === undefined;
  schema.items = this._readType();
  tk.next({val: '>', silent: implicitTags});
  return schema;
};

Reader.prototype._readEnum = function (schema, top) {
  var tk = this._tk;
  if (!tk.next({val: '{', silent: true})) {
    schema.name = tk.next({id: 'name'}).val;
    tk.next({val: '{'});
  }
  schema.symbols = [];
  do {
    schema.symbols.push(tk.next().val);
  } while (!tk.next({val: '}', silent: true}) && tk.next({val: ','}));
  // To avoid confusing syntax, reader enums (i.e. enums with a default value)
  // can only be defined top-level.
  if (top && tk.next({val: '=', silent: true})) {
    schema.default = tk.next().val;
    tk.next({val: ';'});
  }
  return schema;
};

Reader.prototype._readUnion = function () {
  var tk = this._tk;
  var arr = [];
  tk.next({val: '{'});
  do {
    arr.push(this._readType());
  } while (!tk.next({val: '}', silent: true}) && tk.next({val: ','}));
  return arr;
};

Reader.prototype._readRecord = function (schema) {
  var tk = this._tk;
  if (!tk.next({val: '{', silent: true})) {
    schema.name = tk.next({id: 'name'}).val;
    tk.next({val: '{'});
  }
  schema.fields = [];
  while (!tk.next({val: '}', silent: true})) {
    schema.fields.push(this._readField());
    tk.next({val: ';'});
  }
  return schema;
};

Reader.prototype._readImports = function (imports, maybeMessage) {
  var tk = this._tk;
  var numImports = 0;
  var pos = tk.pos;
  while (tk.next({val: 'import', silent: true})) {
    if (!numImports && maybeMessage && tk.next({val: '(', silent: true})) {
      // This will happen if a message is named import.
      tk.pos = pos;
      return;
    }
    var kind = tk.next({id: 'name'}).val;
    var fname = JSON.parse(tk.next({id: 'string'}).val);
    tk.next({val: ';'});
    imports.push({kind: kind, name: fname});
    numImports++;
  }
  return numImports;
};

// Helpers.

/**
 * Simple class to split an input string into tokens.
 *
 * There are different types of tokens, characterized by their `id`:
 *
 * + `number` numbers.
 * + `name` references.
 * + `string` double-quoted.
 * + `operator`, anything else, always single character.
 * + `javadoc`, only emitted when `next` is called with `emitJavadoc` set.
 * + `json`, only emitted when `next` is called with `'json'` as `id` (the
 *   tokenizer doesn't have enough context to predict these).
 */
function Tokenizer(str) {
  this._str = str;
  this.pos = 0;
}

Tokenizer.prototype.next = function (opts) {
  var token = {pos: this.pos, id: undefined, val: undefined};
  var javadoc = this._skip(opts && opts.emitJavadoc);
  if (typeof javadoc == 'string') {
    token.id = 'javadoc';
    token.val = javadoc;
  } else {
    var pos = this.pos;
    var str = this._str;
    var c = str.charAt(pos);
    if (!c) {
      token.id = '(eof)';
    } else {
      if (opts && opts.id === 'json') {
        token.id = 'json';
        this.pos = this._endOfJson();
      } else if (c === '"') {
        token.id = 'string';
        this.pos = this._endOfString();
      } else if (/[0-9]/.test(c)) {
        token.id = 'number';
        this.pos = this._endOf(/[0-9]/);
      } else if (/[`A-Za-z_.]/.test(c)) {
        token.id = 'name';
        this.pos = this._endOf(/[`A-Za-z0-9_.]/);
      } else {
        token.id = 'operator';
        this.pos = pos + 1;
      }
      token.val = str.slice(pos, this.pos);
      if (token.id === 'json') {
        // Let's be nice and give a more helpful error message when this occurs
        // (JSON parsing errors wouldn't let us find the location otherwise).
        try {
          token.val = JSON.parse(token.val);
        } catch (err) {
          throw this.error('invalid JSON', token);
        }
      } else if (token.id === 'name') {
        // Unescape names (our parser doesn't need them).
        token.val = token.val.replace(/`/g, '');
      }
    }
  }

  var err;
  if (opts && opts.id && opts.id !== token.id) {
    err = this.error(f('expected ID %s', opts.id), token);
  } else if (opts && opts.val && opts.val !== token.val) {
    err = this.error(f('expected value %s', opts.val), token);
  }
  if (!err) {
    return token;
  } else if (opts && opts.silent) {
    this.pos = token.pos; // Backtrack to start of token.
    return undefined;
  } else {
    throw err;
  }
};

Tokenizer.prototype.error = function (reason, context) {
  // Context must be either a token or a position.
  var isToken = typeof context != 'number';
  var pos = isToken ? context.pos : context;
  var str = this._str;
  var lineNum = 1;
  var lineStart = 0;
  var i;
  for (i = 0; i < pos; i++) {
    if (str.charAt(i) === '\n') {
      lineNum++;
      lineStart = i;
    }
  }
  var msg = isToken ? f('invalid token %j: %s', context, reason) : reason;
  var err = new Error(msg);
  err.token = isToken ? context : undefined;
  err.lineNum = lineNum;
  err.colNum = pos - lineStart;
  return err;
};

/** Skip whitespace and comments. */
Tokenizer.prototype._skip = function (emitJavadoc) {
  var str = this._str;
  var isJavadoc = false;
  var pos, c;

  while ((c = str.charAt(this.pos)) && /\s/.test(c)) {
    this.pos++;
  }
  pos = this.pos;
  if (c === '/') {
    switch (str.charAt(this.pos + 1)) {
    case '/':
      this.pos += 2;
      while ((c = str.charAt(this.pos)) && c !== '\n') {
        this.pos++;
      }
      return this._skip(emitJavadoc);
    case '*':
      this.pos += 2;
      if (str.charAt(this.pos) === '*') {
        isJavadoc = true;
      }
      while ((c = str.charAt(this.pos++))) {
        if (c === '*' && str.charAt(this.pos) === '/') {
          this.pos++;
          if (isJavadoc && emitJavadoc) {
            return extractJavadoc(str.slice(pos + 3, this.pos - 2));
          }
          return this._skip(emitJavadoc);
        }
      }
      throw this.error('unterminated comment', pos);
    }
  }
};

/** Generic end of method. */
Tokenizer.prototype._endOf = function (pat) {
  var pos = this.pos;
  var str = this._str;
  while (pat.test(str.charAt(pos))) {
    pos++;
  }
  return pos;
};

/** Find end of a string. */
Tokenizer.prototype._endOfString = function () {
  var pos = this.pos + 1; // Skip first double quote.
  var str = this._str;
  var c;
  while ((c = str.charAt(pos))) {
    if (c === '"') {
      // The spec doesn't explicitly say so, but IDLs likely only
      // allow double quotes for strings (C- and Java-style).
      return pos + 1;
    }
    if (c === '\\') {
      pos += 2;
    } else {
      pos++;
    }
  }
  throw this.error('unterminated string', pos - 1);
};

/** Find end of JSON object, throwing an error if the end is reached first. */
Tokenizer.prototype._endOfJson = function () {
  var pos = utils.jsonEnd(this._str, this.pos);
  if (pos < 0) {
    throw this.error('invalid JSON', pos);
  }
  return pos;
};

/**
 * Extract Javadoc contents from the comment.
 *
 * The parsing done is very simple and simply removes the line prefixes and
 * leading / trailing empty lines. It's better to be conservative with
 * formatting rather than risk losing information.
 */
function extractJavadoc(str) {
  var lines = str
    .replace(/^[ \t]+|[ \t]+$/g, '') // Trim whitespace.
    .split('\n').map(function (line, i) {
      return i ? line.replace(/^\s*\*\s?/, '') : line;
    });
  while (lines.length && !lines[0]) {
    lines.shift();
  }
  while (lines.length && !lines[lines.length - 1]) {
    lines.pop();
  }
  return lines.join('\n');
}

/** Returns the namespace generated by a protocol. */
function protocolNamespace(protocol) {
  if (protocol.namespace) {
    return protocol.namespace;
  }
  var match = /^(.*)\.[^.]+$/.exec(protocol.protocol);
  return match ? match[1] : undefined;
}


module.exports = {
  Tokenizer: Tokenizer,
  assembleProtocol: assembleProtocol,
  read: read,
  readProtocol: Reader.readProtocol,
  readSchema: Reader.readSchema
};
