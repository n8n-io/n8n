// Default Export
// ==============
// In this module, we mix our bundled exports into the `_` object and export
// the result. This is analogous to setting `module.exports = _` in CommonJS.
// Hence, this module is also the entry point of our UMD bundle and the package
// entry point for CommonJS and AMD users. In other words, this is (the source
// of) the module you are interfacing with when you do any of the following:
//
// ```js
// // CommonJS
// var _ = require('underscore');
//
// // AMD
// define(['underscore'], function(_) {...});
//
// // UMD in the browser
// // _ is available as a global variable
// ```
import * as allExports from './index.js';
import { mixin } from './index.js';

// Add all of the Underscore functions to the wrapper object.
var _ = mixin(allExports);
// Legacy Node.js API.
_._ = _;
// Export the Underscore API.
export default _;
