'use strict';

var resolveDefaultsModeConfig = require('./resolveDefaultsModeConfig');



Object.keys(resolveDefaultsModeConfig).forEach(function (k) {
	if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
		enumerable: true,
		get: function () { return resolveDefaultsModeConfig[k]; }
	});
});
