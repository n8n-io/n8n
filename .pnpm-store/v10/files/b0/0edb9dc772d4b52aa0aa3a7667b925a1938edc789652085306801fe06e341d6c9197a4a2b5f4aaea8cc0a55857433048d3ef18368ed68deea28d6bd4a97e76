define(['./underscore', './isArray'], function (underscore, isArray) {

  // Normalize a (deep) property `path` to array.
  // Like `_.iteratee`, this function can be customized.
  function toPath(path) {
    return isArray(path) ? path : [path];
  }
  underscore.toPath = toPath;

  return toPath;

});
