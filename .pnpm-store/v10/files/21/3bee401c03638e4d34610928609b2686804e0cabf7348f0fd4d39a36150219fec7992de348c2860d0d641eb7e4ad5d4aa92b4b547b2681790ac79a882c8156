var colors = require('./colors');
module['exports'] = colors;

// Remark: By default, colors will add style properties to String.prototype.
//
// If you don't wish to extend String.prototype, you can do this instead and
// native String will not be touched:
//
//   var colors = require('@colors/colors/safe');
//   colors.red("foo")
//
//
require('./extendStringPrototype')();
