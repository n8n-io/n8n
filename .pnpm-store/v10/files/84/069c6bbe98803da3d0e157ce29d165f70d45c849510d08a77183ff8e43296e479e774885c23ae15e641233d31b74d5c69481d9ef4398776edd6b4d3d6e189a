'use strict';

module.exports = function(dirname) {
	var path = require('path');
	var resolve = require('./resolve.js');
	var appRootPath = resolve(dirname);

	var publicInterface = {
		resolve: function(pathToModule) {
			return path.join(appRootPath, pathToModule);
		},

		require: function(pathToModule) {
			return require(publicInterface.resolve(pathToModule));
		},

		toString: function() {
			return appRootPath;
		},

		setPath: function(explicitlySetPath) {
			appRootPath = path.resolve(explicitlySetPath);
			publicInterface.path = appRootPath;
		},

		path: appRootPath
	};

	return publicInterface;
};