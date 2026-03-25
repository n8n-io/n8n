var path = require('path');
var assert = require('assert');
require('../').addPath(path.join(__dirname, 'src'));

require('module-a').sayHello();
require('module-b').sayHello();
require('installed-module').sayHello();

assert(require('installed-module.js').isLocal);

require('package.json');

console.log('All tests passed!');