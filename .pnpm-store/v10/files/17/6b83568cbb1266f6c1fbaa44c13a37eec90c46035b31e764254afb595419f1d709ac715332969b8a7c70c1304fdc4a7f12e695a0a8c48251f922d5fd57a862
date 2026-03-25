'use strict';

var fs = require('fs');
var path = require('path');
var walk = require('pug-walk');
var assign = require('object-assign');

module.exports = load;
function load(ast, options) {
  options = getOptions(options);
  // clone the ast
  ast = JSON.parse(JSON.stringify(ast));
  return walk(ast, function(node) {
    if (node.str === undefined) {
      if (
        node.type === 'Include' ||
        node.type === 'RawInclude' ||
        node.type === 'Extends'
      ) {
        var file = node.file;
        if (file.type !== 'FileReference') {
          throw new Error('Expected file.type to be "FileReference"');
        }
        var path, str, raw;
        try {
          path = options.resolve(file.path, file.filename, options);
          file.fullPath = path;
          raw = options.read(path, options);
          str = raw.toString('utf8');
        } catch (ex) {
          ex.message += '\n    at ' + node.filename + ' line ' + node.line;
          throw ex;
        }
        file.str = str;
        file.raw = raw;
        if (node.type === 'Extends' || node.type === 'Include') {
          file.ast = load.string(
            str,
            assign({}, options, {
              filename: path,
            })
          );
        }
      }
    }
  });
}

load.string = function loadString(src, options) {
  options = assign(getOptions(options), {
    src: src,
  });
  var tokens = options.lex(src, options);
  var ast = options.parse(tokens, options);
  return load(ast, options);
};
load.file = function loadFile(filename, options) {
  options = assign(getOptions(options), {
    filename: filename,
  });
  var str = options.read(filename).toString('utf8');
  return load.string(str, options);
};

load.resolve = function resolve(filename, source, options) {
  filename = filename.trim();
  if (filename[0] !== '/' && !source)
    throw new Error(
      'the "filename" option is required to use includes and extends with "relative" paths'
    );

  if (filename[0] === '/' && !options.basedir)
    throw new Error(
      'the "basedir" option is required to use includes and extends with "absolute" paths'
    );

  filename = path.join(
    filename[0] === '/' ? options.basedir : path.dirname(source.trim()),
    filename
  );

  return filename;
};
load.read = function read(filename, options) {
  return fs.readFileSync(filename);
};

load.validateOptions = function validateOptions(options) {
  /* istanbul ignore if */
  if (typeof options !== 'object') {
    throw new TypeError('options must be an object');
  }
  /* istanbul ignore if */
  if (typeof options.lex !== 'function') {
    throw new TypeError('options.lex must be a function');
  }
  /* istanbul ignore if */
  if (typeof options.parse !== 'function') {
    throw new TypeError('options.parse must be a function');
  }
  /* istanbul ignore if */
  if (options.resolve && typeof options.resolve !== 'function') {
    throw new TypeError('options.resolve must be a function');
  }
  /* istanbul ignore if */
  if (options.read && typeof options.read !== 'function') {
    throw new TypeError('options.read must be a function');
  }
};

function getOptions(options) {
  load.validateOptions(options);
  return assign(
    {
      resolve: load.resolve,
      read: load.read,
    },
    options
  );
}
