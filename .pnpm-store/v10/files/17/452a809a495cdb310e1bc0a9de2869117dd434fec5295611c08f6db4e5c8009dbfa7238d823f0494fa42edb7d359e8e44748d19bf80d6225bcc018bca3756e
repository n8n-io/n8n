'use strict';

module.exports = getPathVar;
var PATH_REGEX = /^PATH$/i;

function getPathVar(env, platform) {
  var PATH = 'PATH';

  if (platform === 'win32') {
    PATH = 'Path';
    Object.keys(env).some(function (e) {
      var matches = PATH_REGEX.test(e);
      if (matches) {
        PATH = e;
      }
      return matches;
    });
  }
  return PATH;
}