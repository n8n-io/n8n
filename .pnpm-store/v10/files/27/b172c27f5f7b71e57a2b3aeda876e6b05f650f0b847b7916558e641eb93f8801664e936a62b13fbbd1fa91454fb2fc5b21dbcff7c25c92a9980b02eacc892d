var shellescape = require('../');

var assert = require('assert');

var args = ['curl', '-v', '-H', 'Location;', '-H', 'User-Agent: dave#10', 'http://www.daveeddy.com/?name=dave&age=24'];

var escaped = shellescape(args);

assert.strictEqual(escaped, "curl -v -H 'Location;' -H 'User-Agent: dave#10' 'http://www.daveeddy.com/?name=dave&age=24'");
console.log(escaped);
