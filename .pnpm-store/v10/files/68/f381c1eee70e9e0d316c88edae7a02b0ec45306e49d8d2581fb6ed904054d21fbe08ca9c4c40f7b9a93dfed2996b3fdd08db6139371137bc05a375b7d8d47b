var restArguments = require('./restArguments.js');
var reduce = require('./reduce.js');

function nextValue(previous, func) {
  return func(previous);
}

var pipe = restArguments(function(value, funcs) {
  return reduce(funcs, nextValue, value);
});

module.exports = pipe;
