'use strict';

exports.path = require('path').dirname(require.main.filename);

exports.resolve = function(pathToModule) {
	return exports.path + pathToModule;
};

exports.require = function(pathToModule) {
	var r = 'function' === typeof __webpack_require__
		? __non_webpack_require__
		: require;
	return r(exports.resolve(pathToModule));
};

exports.toString = function() {
	return exports.path;
};

exports.setPath = function(explicitlySetPath) {
	exports.path = explicitlySetPath;
};