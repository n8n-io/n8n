var DockerIgnore = require('@balena/dockerignore');
var fs = require('fs');
var path = require('path');
var tar = require('tar-fs');
var zlib = require('zlib');

// https://github.com/HenrikJoreteg/extend-object/blob/v0.1.0/extend-object.js

var arr = [];
var each = arr.forEach;
var slice = arr.slice;

module.exports.extend = function(obj) {
  each.call(slice.call(arguments, 1), function(source) {
    if (source) {
      for (var prop in source) {
        obj[prop] = source[prop];
      }
    }
  });
  return obj;
};

module.exports.processArgs = function(opts, callback, defaultOpts) {
  if (!callback && typeof opts === 'function') {
    callback = opts;
    opts = null;
  }
  return {
    callback: callback,
    opts: module.exports.extend({}, defaultOpts, opts)
  };
};


/**
 * Parse the given repo tag name (as a string) and break it out into repo/tag pair.
 * // if given the input http://localhost:8080/woot:latest
 * {
 *   repository: 'http://localhost:8080/woot',
 *   tag: 'latest'
 * }
 * @param {String} input Input e.g: 'repo/foo', 'ubuntu', 'ubuntu:latest'
 * @return {Object} input parsed into the repo and tag.
 */
module.exports.parseRepositoryTag = function(input) {
  var separatorPos;
  var digestPos = input.indexOf('@');
  var colonPos = input.lastIndexOf(':');
  // @ symbol is more important
  if (digestPos >= 0) {
    separatorPos = digestPos;
  } else if (colonPos >= 0) {
    separatorPos = colonPos;
  } else {
    // no colon nor @
    return {
      repository: input
    };
  }

  // last colon is either the tag (or part of a port designation)
  var tag = input.slice(separatorPos + 1);

  // if it contains a / its not a tag and is part of the url
  if (tag.indexOf('/') === -1) {
    return {
      repository: input.slice(0, separatorPos),
      tag: tag
    };
  }

  return {
    repository: input
  };
};


module.exports.prepareBuildContext = function(file, next) {
  if (file && file.context) {
    fs.readFile(path.join(file.context, '.dockerignore'), (err, data) => {
      let ignoreFn;
      let filterFn;

      if (!err) {
        const dockerIgnore = DockerIgnore({ ignorecase: false }).add(data.toString());

        filterFn = dockerIgnore.createFilter();
        ignoreFn = (path) => {
          return !filterFn(path);
        }
      }

      const entries = file.src.slice() || []

      const pack = tar.pack(file.context, {
        entries: filterFn ? entries.filter(filterFn) : entries,
        ignore: ignoreFn // Only works on directories
      });

      next(pack.pipe(zlib.createGzip()));
    })
  } else {
    next(file);
  }
}
