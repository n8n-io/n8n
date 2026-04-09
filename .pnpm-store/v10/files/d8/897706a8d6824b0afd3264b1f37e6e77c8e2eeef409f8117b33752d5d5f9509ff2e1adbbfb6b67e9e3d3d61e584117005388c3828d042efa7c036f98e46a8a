'use strict';
var global = require('../internals/global');
var uncurryThis = require('../internals/function-uncurry-this');

module.exports = function (CONSTRUCTOR, METHOD) {
  return uncurryThis(global[CONSTRUCTOR].prototype[METHOD]);
};
