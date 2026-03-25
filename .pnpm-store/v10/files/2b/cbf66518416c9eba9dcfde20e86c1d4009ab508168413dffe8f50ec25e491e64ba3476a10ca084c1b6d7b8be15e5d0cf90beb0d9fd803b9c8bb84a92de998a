'use strict';

var jstransformer = require('jstransformer');
var resolve = require('resolve');

module.exports = filter;

function getMinifyTransformerName(outputFormat) {
  switch (outputFormat) {
    case 'js':
      return 'uglify-js';
    case 'css':
      return 'clean-css';
  }
}

function filter(name, str, options, currentDirectory, funcName) {
  funcName = funcName || 'render';
  var trPath;
  try {
    try {
      trPath = resolve.sync('jstransformer-' + name, {
        basedir: currentDirectory || process.cwd(),
      });
    } catch (ex) {
      trPath = require.resolve('jstransformer-' + name);
    }
  } catch (ex) {
    var err = new Error('unknown filter ":' + name + '"');
    err.code = 'UNKNOWN_FILTER';
    throw err;
  }
  var tr = jstransformer(require(trPath));
  // TODO: we may want to add a way for people to separately specify "locals"
  var result = tr[funcName](str, options, options).body;
  if (options && options.minify) {
    var minifyTranformer = getMinifyTransformerName(tr.outputFormat);
    if (minifyTranformer) {
      try {
        result = filter(minifyTranformer, result, null, currentDirectory);
      } catch (ex) {
        // better to fail to minify than output nothing
      }
    }
  }
  return result;
}
