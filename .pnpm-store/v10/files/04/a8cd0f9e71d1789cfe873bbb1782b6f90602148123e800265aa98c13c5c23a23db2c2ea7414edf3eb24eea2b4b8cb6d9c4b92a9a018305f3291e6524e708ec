var dirname = require('path').dirname;
var addPath = require('.').addPath;

addPath(dirname(module.parent.filename), module.parent);

// https://github.com/jhnns/rewire/blob/master/lib/index.js
delete require.cache[__filename]; // deleting self from module cache so the parent module is always up to date
