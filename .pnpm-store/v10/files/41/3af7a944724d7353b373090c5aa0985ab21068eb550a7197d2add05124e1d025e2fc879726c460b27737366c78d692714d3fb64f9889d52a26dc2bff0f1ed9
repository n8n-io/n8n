var filter = require('./filter.js');
var matcher = require('./matcher.js');

// Convenience version of a common use case of `_.filter`: selecting only
// objects containing specific `key:value` pairs.
function where(obj, attrs) {
  return filter(obj, matcher(attrs));
}

module.exports = where;
