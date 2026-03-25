var underscore = require('./underscore.js');

// Helper function to continue chaining intermediate results.
function chainResult(instance, obj) {
  return instance._chain ? underscore(obj).chain() : obj;
}

module.exports = chainResult;
