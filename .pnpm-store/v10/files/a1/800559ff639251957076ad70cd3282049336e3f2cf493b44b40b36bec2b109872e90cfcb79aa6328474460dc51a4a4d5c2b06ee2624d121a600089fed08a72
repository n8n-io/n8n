'use strict';

var getPathVar = require('./get-path-var');
var getSeparator = require('./get-separator');

module.exports = managePath;

function managePath() {
  var env = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  var _ref = arguments.length <= 1 || arguments[1] === undefined ? { platform: process.platform } : arguments[1];

  var _ref$platform = _ref.platform;
  var platform = _ref$platform === undefined ? process.platform : _ref$platform;

  var pathVar = getPathVar(env, platform);
  var separator = getSeparator(platform);
  var originalPath = env[pathVar];
  return { push: push, unshift: unshift, get: get, restore: restore };

  function push() {
    for (var _len = arguments.length, paths = Array(_len), _key = 0; _key < _len; _key++) {
      paths[_key] = arguments[_key];
    }

    return change(true, paths);
  }

  function unshift() {
    for (var _len2 = arguments.length, paths = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      paths[_key2] = arguments[_key2];
    }

    return change(false, paths);
  }

  function get() {
    return env[pathVar];
  }

  function restore() {
    env[pathVar] = originalPath;
    return get();
  }

  function change(append, paths) {
    if (!append) {
      paths = paths.reverse();
    }
    paths.forEach(function (path) {
      var pathArray = getPathArray(path);
      addExistingPath(pathArray, env[pathVar], append);
      env[pathVar] = pathArray.join(separator);
    });
    return get();
  }
}

function getPathArray(pathToAdd) {
  if (Array.isArray(pathToAdd)) {
    return pathToAdd;
  } else {
    return [pathToAdd];
  }
}

function addExistingPath(array, path, appendMode) {
  if (!path) {
    return;
  }
  if (appendMode) {
    array.unshift(path);
  } else {
    array.push(path);
  }
}